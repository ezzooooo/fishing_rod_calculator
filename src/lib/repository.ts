import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, writeBatch, type Firestore, type Transaction } from 'firebase/firestore';
import { normalizeBrand, normalizeFishingRod, normalizeQuoteRecord, quoteTotals, validateQuote, type Brand, type FishingRod, type QuoteRecord } from './domain';
import { cloneEquipmentItem, normalizeEquipmentCategory, normalizeEquipmentProduct, validateEquipmentCategory, validateEquipmentProduct, type EquipmentCategory, type EquipmentProduct } from './equipment';
import { assertBrandAvailable, brandDocumentId, normalizeBrandAliases, planBrandImport, validateBrandInput, type BrandImportResult, type BrandInput } from './brands';

export type QuoteInput = Pick<QuoteRecord, 'title' | 'note' | 'customerName' | 'mode' | 'items'>;
type Receive<T> = (value: T) => void;
type Fail = (error: Error) => void;
export interface AppRepository {
  watchBrands(receive: Receive<Brand[]>, fail: Fail): () => void;
  watchRods(receive: Receive<FishingRod[]>, fail: Fail): () => void;
  watchEquipmentCategories(receive: Receive<EquipmentCategory[]>, fail: Fail): () => void;
  watchEquipmentProducts(receive: Receive<EquipmentProduct[]>, fail: Fail): () => void;
  saveEquipmentCategory(value: EquipmentCategory): Promise<void>;
  deleteEquipmentCategory(id: string): Promise<void>;
  saveEquipmentProduct(value: EquipmentProduct): Promise<void>;
  deleteEquipmentProduct(id: string): Promise<void>;
  watchQuotes(receive: Receive<QuoteRecord[]>, fail: Fail): () => void;
  watchQuote(id: string, receive: Receive<QuoteRecord | null>, fail: Fail): () => void;
  createBrand(name: string, aliases?: readonly string[]): Promise<void>;
  updateBrand(id: string, name: string, aliases?: readonly string[]): Promise<void>;
  importBrands(entries: readonly BrandInput[]): Promise<BrandImportResult>;
  deleteBrand(id: string): Promise<void>;
  saveRod(rod: FishingRod): Promise<void>;
  deleteRod(id: string): Promise<void>;
  replaceBrands(brands: Brand[]): Promise<void>;
  replaceRods(rods: FishingRod[]): Promise<void>;
  createQuote(input: QuoteInput): Promise<string>;
  updateQuote(record: QuoteRecord): Promise<void>;
  deleteQuote(id: string): Promise<void>;
}
export class QuoteConflictError extends Error {
  constructor() { super('다른 직원이 이 견적을 수정했습니다. 최신 내역을 확인한 뒤 다시 수정해주세요.'); this.name = 'QuoteConflictError'; }
}
function documentId(id: string): string {
  if (!id || id.includes('/')) throw new Error('잘못된 문서 주소입니다.');
  return id;
}
function requiredName(name: string): string {
  const value = name.trim();
  if (!value || value.length > 120) throw new Error('이름을 1~120자로 입력해주세요.');
  return value;
}
function rodData(rod: FishingRod) {
  const value = normalizeFishingRod(rod as unknown as Record<string, unknown>, documentId(rod.id));
  requiredName(value.name);
  if (!value.brandId) throw new Error('브랜드를 선택해주세요.');
  const prices = Object.values(value.saleLengthPrices);
  return { ...value, lengthPrices: value.saleLengthPrices, usedPrice: prices.length ? prices.reduce((total, price) => total + price, 0) / prices.length : value.usedPrice, createdAt: value.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
}
function quoteData(input: QuoteInput) {
  validateQuote(input);
  const totals = quoteTotals(input.items);
  return { title: input.title.trim(), note: input.note.trim(), customerName: input.customerName.trim(), mode: input.mode, items: input.items.map(item => item.kind === 'equipment' ? cloneEquipmentItem(item) : ({ ...item })), totalQuantity: totals.totalQuantity, totalPrice: totals.totalPrice };
}
export class FirebaseRepository implements AppRepository {
  constructor(private readonly database: Firestore, private readonly session: () => { uid: string | null; authorized: boolean }) {}
  private authorize() {
    const session = this.session();
    if (!session.authorized || !session.uid) throw new Error('로그인한 직원만 데이터를 변경할 수 있습니다.');
    return session.uid;
  }
  watchBrands(receive: Receive<Brand[]>, fail: Fail) {
    this.authorize();
    return onSnapshot(collection(this.database, 'brands'), snapshot => {
      try { receive(snapshot.docs.map(value => normalizeBrand(value.data(), value.id)).sort((a,b) => a.name.localeCompare(b.name, 'ko'))); } catch(error) { fail(asError(error)); }
    }, fail);
  }
  watchRods(receive: Receive<FishingRod[]>, fail: Fail) {
    this.authorize();
    return onSnapshot(collection(this.database, 'fishing_rods'), snapshot => {
      try { receive(snapshot.docs.map(value => normalizeFishingRod(value.data(), value.id)).sort((a,b) => a.name.localeCompare(b.name, 'ko'))); } catch(error) { fail(asError(error)); }
    }, fail);
  }
  watchEquipmentCategories(receive: Receive<EquipmentCategory[]>, fail: Fail) {
    this.authorize();
    return onSnapshot(collection(this.database, 'equipment_categories'), snapshot => {
      try { receive(snapshot.docs.map(value => { const category = normalizeEquipmentCategory(value.data(), value.id); validateEquipmentCategory(category); return category; }).sort((a,b) => a.name.localeCompare(b.name, 'ko'))); } catch(error) { fail(asError(error)); }
    }, fail);
  }
  watchEquipmentProducts(receive: Receive<EquipmentProduct[]>, fail: Fail) {
    this.authorize();
    return onSnapshot(collection(this.database, 'equipment_products'), snapshot => {
      try { receive(snapshot.docs.map(value => { const product = normalizeEquipmentProduct(value.data(), value.id); validateEquipmentProduct(product); return product; }).sort((a,b) => a.name.localeCompare(b.name, 'ko'))); } catch(error) { fail(asError(error)); }
    }, fail);
  }
  async saveEquipmentCategory(value: EquipmentCategory) {
    this.authorize(); validateEquipmentCategory(value);
    const category = normalizeEquipmentCategory(value as unknown as Record<string,unknown>, documentId(value.id));
    await setDoc(doc(this.database, 'equipment_categories', category.id), { ...category, createdAt:value.createdAt??new Date().toISOString(), updatedAt:new Date().toISOString() });
  }
  async deleteEquipmentCategory(id: string) { this.authorize(); await deleteDoc(doc(this.database,'equipment_categories',documentId(id))); }
  async saveEquipmentProduct(value: EquipmentProduct) {
    this.authorize(); validateEquipmentProduct(value);
    const product = normalizeEquipmentProduct(value as unknown as Record<string,unknown>, documentId(value.id));
    await setDoc(doc(this.database, 'equipment_products', product.id), { ...product, createdAt:value.createdAt??new Date().toISOString(), updatedAt:new Date().toISOString() });
  }
  async deleteEquipmentProduct(id: string) { this.authorize(); await deleteDoc(doc(this.database,'equipment_products',documentId(id))); }
  watchQuotes(receive: Receive<QuoteRecord[]>, fail: Fail) {
    this.authorize();
    return onSnapshot(query(collection(this.database, 'quote_records'), orderBy('createdAt','desc')), snapshot => {
      try { receive(snapshot.docs.map(value => normalizeQuoteRecord(value.data(), value.id))); } catch(error) { fail(asError(error)); }
    }, fail);
  }
  watchQuote(id: string, receive: Receive<QuoteRecord | null>, fail: Fail) {
    this.authorize();
    return onSnapshot(doc(this.database,'quote_records',documentId(id)), snapshot => {
      try { receive(snapshot.exists() ? normalizeQuoteRecord(snapshot.data(),snapshot.id) : null); } catch(error) { fail(asError(error)); }
    }, fail);
  }
  private async brandTransaction<T>(names: readonly string[], apply: (transaction: Transaction, brands: Brand[]) => T): Promise<T> {
    this.authorize();
    const existing = await getDocs(collection(this.database, 'brands'));
    const ids = [...new Set([...existing.docs.map(value => value.id), ...names.map(brandDocumentId)])];
    return runTransaction(this.database, async transaction => {
      this.authorize();
      // Read again inside the transaction, so edits/deletions since preview cannot be overwritten.
      const latest = await Promise.all(ids.map(id => transaction.get(doc(this.database, 'brands', documentId(id)))));
      return apply(transaction, latest.filter(value => value.exists()).map(value => normalizeBrand(value.data()!, value.id)));
    });
  }
  async createBrand(name: string, aliases?: readonly string[]) {
    this.authorize();
    const value = validateBrandInput({ name, aliases });
    await this.brandTransaction([value.name], (transaction, brands) => {
      assertBrandAvailable(brands, value);
      const id = brandDocumentId(value.name);
      if (brands.some(brand => brand.id === id)) throw new Error('브랜드 주소가 기존 데이터와 겹칩니다. 이름을 확인해주세요.');
      transaction.set(doc(this.database, 'brands', id), { ...value, createdAt: new Date().toISOString(), updatedAt: null });
    });
  }
  async updateBrand(id: string, name: string, aliases?: readonly string[]) {
    this.authorize(); documentId(id);
    validateBrandInput({ name, aliases });
    await this.brandTransaction([name], (transaction, brands) => {
      const previous = brands.find(brand => brand.id === id);
      if (!previous) throw new Error('삭제된 브랜드입니다. 목록을 새로 불러와주세요.');
      const value = validateBrandInput({ name, aliases: [...(aliases ?? previous.aliases ?? []), ...(previous.name !== name.trim() ? [previous.name] : [])] });
      assertBrandAvailable(brands, value, id);
      transaction.update(doc(this.database, 'brands', id), { ...value, updatedAt: new Date().toISOString() });
    });
  }
  async importBrands(entries: readonly BrandInput[]): Promise<BrandImportResult> {
    this.authorize();
    const inputs = entries.map(validateBrandInput);
    // Validate the complete request before opening the transaction or writing any document.
    planBrandImport([], inputs);
    return this.brandTransaction(inputs.map(value => value.name), (transaction, brands) => {
      const plan = planBrandImport(brands, inputs);
      if (plan.conflicts) throw new Error(`브랜드 이름 또는 별칭이 겹치는 항목 ${plan.conflicts}개가 있습니다. 미리보기를 다시 확인해주세요.`);
      const now = new Date().toISOString();
      for (const entry of plan.entries) {
        if (entry.action === 'unchanged') continue;
        const value = { name: entry.name, aliases: entry.aliases, updatedAt: now };
        if (entry.action === 'update' && entry.id) transaction.update(doc(this.database, 'brands', entry.id), value);
        else if (entry.action === 'create') {
          const id = brandDocumentId(entry.name);
          if (brands.some(brand => brand.id === id)) throw new Error('브랜드 주소가 기존 데이터와 겹칩니다. 미리보기를 다시 확인해주세요.');
          transaction.set(doc(this.database, 'brands', id), { ...value, createdAt: now });
        }
      }
      return { created: plan.created, updated: plan.updated, unchanged: plan.unchanged };
    });
  }
  async deleteBrand(id: string) { this.authorize(); await deleteDoc(doc(this.database,'brands',documentId(id))); }
  async saveRod(rod: FishingRod) { this.authorize(); await setDoc(doc(this.database,'fishing_rods',documentId(rod.id)),rodData(rod)); }
  async deleteRod(id: string) { this.authorize(); await deleteDoc(doc(this.database,'fishing_rods',documentId(id))); }
  private async replace<T extends {id: string}>(path: string, values: T[]) {
    this.authorize();
    if(new Set(values.map(value=>value.id)).size!==values.length) throw new Error('중복된 문서 ID가 있습니다.');
    values.forEach(value=>documentId(value.id));
    const existing=await getDocs(collection(this.database,path));
    const ids=new Set(values.map(value=>value.id));
    const operations=[...existing.docs.filter(value=>!ids.has(value.id)).map(value=>({id:value.id,data:null as T|null})),...values.map(value=>({id:value.id,data:value as T|null}))];
    for(let offset=0;offset<operations.length;offset+=400){
      const batch=writeBatch(this.database);
      for(const operation of operations.slice(offset,offset+400)){
        const reference=doc(this.database,path,operation.id);
        if(operation.data===null) batch.delete(reference); else batch.set(reference,operation.data);
      }
      await batch.commit();
    }
  }
  async replaceBrands(brands: Brand[]) {
    const values=brands.map(value=>({...value,name:requiredName(value.name),aliases:normalizeBrandAliases(value.name,value.aliases),createdAt:value.createdAt??null,updatedAt:value.updatedAt??null}));
    await this.replace('brands',values);
  }
  async replaceRods(rods: FishingRod[]) { await this.replace('fishing_rods',rods.map(rodData)); }
  async createQuote(input: QuoteInput) {
    const uid=this.authorize();
    const reference=await addDoc(collection(this.database,'quote_records'),{...quoteData(input),createdBy:uid,createdAt:serverTimestamp(),clientCreatedAt:new Date().toISOString(),updatedAt:null,revision:0});
    return reference.id;
  }
  async updateQuote(record: QuoteRecord) {
    this.authorize();
    const data=quoteData(record);
    const reference=doc(this.database,'quote_records',documentId(record.id));
    await runTransaction(this.database,async transaction=>{
      const previous=await transaction.get(reference);
      if(!previous.exists()) throw new Error('삭제된 견적입니다. 견적 내역을 다시 확인해주세요.');
      if(Number(previous.data().revision??0)!==record.revision) throw new QuoteConflictError();
      transaction.update(reference,{...data,revision:record.revision+1,updatedAt:serverTimestamp(),clientUpdatedAt:new Date().toISOString()});
    });
  }
  async deleteQuote(id: string) { this.authorize(); await deleteDoc(doc(this.database,'quote_records',documentId(id))); }
}
export function asError(error: unknown): Error { return error instanceof Error ? error : new Error('요청을 처리하지 못했습니다. 다시 시도해주세요.'); }
