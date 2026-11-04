const RECEIPT_WIDTH = 900;
const RECEIPT_PADDING = 24;
const RESOURCE_TIMEOUT = 15_000;
const MAX_CANVAS_DIMENSION = 16_384;
const MAX_CANVAS_PIXELS = 16_777_216;

function withTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), RESOURCE_TIMEOUT);
    operation.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (failure) => { window.clearTimeout(timer); reject(failure); },
    );
  });
}

function copyStyles(source: Document, destination: Document): Promise<void>[] {
  return [...source.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style')].map((style) => {
    if (style.tagName === "STYLE") {
      destination.head.append(destination.importNode(style, true));
      return Promise.resolve();
    }
    const original = style as HTMLLinkElement;
    if (original.disabled) return Promise.resolve();
    const link = destination.createElement("link");
    link.rel = "stylesheet";
    link.href = original.href;
    link.media = original.media;
    return withTimeout(new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("견적서 이미지의 스타일을 불러오지 못했습니다."));
      destination.head.append(link);
    }), "견적서 이미지의 스타일 로딩 시간이 초과되었습니다.");
  });
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("견적서의 이미지를 읽지 못했습니다."));
    reader.onerror = () => reject(new Error("견적서의 이미지를 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

async function embedImages(root: HTMLElement): Promise<void> {
  await Promise.all([...root.querySelectorAll<HTMLImageElement>("img")].map(async (image) => {
    const url = image.currentSrc || image.src;
    if (!url) throw new Error("견적서 이미지의 로고 주소를 확인해주세요.");
    image.loading = "eager";
    image.removeAttribute("srcset");
    if (!url.startsWith("data:")) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), RESOURCE_TIMEOUT);
      try {
        const response = await fetch(url, { credentials: "same-origin", signal: controller.signal });
        if (!response.ok) throw new Error("견적서의 로고 또는 이미지를 불러오지 못했습니다.");
        image.src = await asDataUrl(await response.blob());
      } finally {
        window.clearTimeout(timer);
      }
    }
    await withTimeout(image.decode(), "견적서의 로고 또는 이미지 로딩 시간이 초과되었습니다.");
    if (!image.naturalWidth) throw new Error("견적서의 로고 또는 이미지를 읽지 못했습니다.");
  }));
}

function pngBlob(blob: Blob | null): Blob {
  if (!blob || blob.type !== "image/png" || blob.size === 0) {
    throw new Error("전체 견적서 이미지를 만들지 못했습니다. 인쇄 / PDF 저장을 이용해주세요.");
  }
  return blob;
}

/** Render a fresh desktop-width receipt, independent of modal scrolling or device width. */
export async function createReceiptImage(element: HTMLElement): Promise<Blob> {
  if (typeof window === "undefined" || !element.isConnected) {
    throw new Error("견적서 미리보기를 연 뒤 이미지로 저장해주세요.");
  }
  const sourceDocument = element.ownerDocument;
  const frame = sourceDocument.createElement("iframe");
  frame.title = "견적서 이미지 준비";
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.dataset.receiptImageRenderer = "true";
  Object.assign(frame.style, {
    position: "fixed", left: "-10000px", top: "0", width: `${RECEIPT_WIDTH}px`,
    height: "1px", border: "0", pointerEvents: "none",
  });
  sourceDocument.body.append(frame);
  try {
    const imageDocument = frame.contentDocument;
    const imageWindow = frame.contentWindow;
    if (!imageDocument || !imageWindow) throw new Error("견적서 이미지 화면을 준비하지 못했습니다.");
    imageDocument.documentElement.lang = sourceDocument.documentElement.lang || "ko";
    const base = imageDocument.createElement("base");
    base.href = sourceDocument.baseURI;
    imageDocument.head.append(base);
    const stylesReady = copyStyles(sourceDocument, imageDocument);
    const reset = imageDocument.createElement("style");
    reset.textContent = "html,body{margin:0!important;padding:0!important;min-height:0!important;height:auto!important;overflow:visible!important;background:#fff!important}*{animation:none!important;transition:none!important}";
    imageDocument.head.append(reset);

    const canvasRoot = imageDocument.createElement("div");
    Object.assign(canvasRoot.style, {
      boxSizing: "border-box", width: `${RECEIPT_WIDTH}px`, padding: `${RECEIPT_PADDING}px`,
      background: "#fff", colorScheme: "light", overflow: "visible",
    });
    // Clone DOM nodes rather than serializing customer text into HTML.
    const receipt = imageDocument.importNode(element, true) as HTMLElement;
    Object.assign(receipt.style, {
      width: "100%", minWidth: "0", maxWidth: "none", height: "auto", maxHeight: "none", overflow: "visible",
    });
    canvasRoot.append(receipt);
    imageDocument.body.append(canvasRoot);

    const [{ toBlob }] = await Promise.all([import("html-to-image"), ...stylesReady]);
    for (const node of [receipt, ...receipt.querySelectorAll<HTMLElement>("*")]) {
      const style = imageWindow.getComputedStyle(node);
      if (/(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
        node.style.overflow = "visible";
        node.style.maxHeight = "none";
        node.style.height = "auto";
      }
    }
    await Promise.all([
      embedImages(receipt),
      withTimeout(imageDocument.fonts.ready, "견적서 글꼴 로딩 시간이 초과되었습니다."),
    ]);
    // Expand unusually wide saved values rather than cutting off a table column.
    const width = Math.max(RECEIPT_WIDTH, Math.ceil(canvasRoot.scrollWidth));
    canvasRoot.style.width = `${width}px`;
    const height = Math.ceil(Math.max(canvasRoot.scrollHeight, canvasRoot.getBoundingClientRect().height));
    if (height <= RECEIPT_PADDING * 2) throw new Error("이미지로 저장할 견적서 내용이 없습니다.");
    // Keep the whole receipt on one canvas; reduce resolution for very long quotes.
    const pixelRatio = Math.min(
      2,
      MAX_CANVAS_DIMENSION / Math.max(width, height),
      Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
    );
    const blob = await toBlob(canvasRoot, {
      width, height, backgroundColor: "#fff", pixelRatio,
      preferredFontFormat: "woff2", includeQueryParams: true,
    });
    return pngBlob(blob);
  } catch (failure) {
    const detail = failure instanceof Error ? ` ${failure.message}` : "";
    throw new Error(`견적서 이미지를 만들지 못했습니다.${detail}`);
  } finally {
    frame.remove();
  }
}

/** Pass a prepared PNG directly from the click handler, with no rendering await first. */
export async function copyReceiptImage(image: Blob): Promise<void> {
  const png = pngBlob(image);
  if (typeof navigator === "undefined" || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("이 브라우저에서는 이미지 복사를 지원하지 않습니다. PNG 저장을 이용해주세요.");
  }
  const copyFailure = () => new Error("견적서 이미지를 복사하지 못했습니다. 클립보드 권한을 확인하거나 PNG 저장을 이용해주세요.");
  let completion: Promise<void>;
  try {
    completion = navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
  } catch {
    throw copyFailure();
  }
  await withTimeout(
    completion.catch(() => { throw copyFailure(); }),
    "이미지 복사 완료 응답을 받지 못했습니다. 다시 시도하거나 PNG 저장을 이용해주세요.",
  );
}

export function downloadReceiptImage(blob: Blob, filename: string): void {
  const image = pngBlob(blob);
  const url = URL.createObjectURL(image);
  const link = document.createElement("a");
  link.href = url;
  const cleanName = Array.from(filename, (character) => character.charCodeAt(0) < 32 ? "_" : character).join("");
  link.download = `${cleanName.replace(/[\\/:*?"<>|]/g, "_").replace(/\.png$/i, "").trim() || "견적서"}.png`;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Keep the URL alive until the browser has consumed the download navigation.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
