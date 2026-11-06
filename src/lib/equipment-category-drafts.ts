import type { EquipmentCategory, EquipmentOptionChoice, EquipmentOptionGroup } from './equipment';

/**
 * Initial category templates reviewed from public product descriptions on 2026-11-05.
 * Importing this module never registers anything. Apply only through the import confirmation UI.
 * Unknown adjustments stay null; zero is reserved for a confirmed no-charge component.
 */
const choice = (id: string, label: string): EquipmentOptionChoice => ({ id, label, purchasePrice: null, salePrice: null });
const group = (id: string, name: string, selection: EquipmentOptionGroup['selection'], choices: [string, string][]): EquipmentOptionGroup => ({ id, name, selection, required: false, choices: choices.map(([id, label]) => choice(id, label)) });
const category = (slug: string, name: string, unit: string, optionGroups: EquipmentOptionGroup[]): EquipmentCategory => ({ id: `draft-category-${slug}`, name, unit, optionGroups });

export const equipmentCategoryDrafts: readonly EquipmentCategory[] = [
  category('tent', '텐트', '동', [
    group('fly', '플라이', 'multiple', [['long', '롱플라이'], ['half', '하프플라이']]),
    group('floor', '이너·바닥 구성', 'multiple', [['inner', '이너텐트'], ['padding', '이너패딩'], ['mat', '매트'], ['groundsheet', '방수포']]),
    group('weather', '차양·전면 구성', 'multiple', [['rain-cover', '빗물가리개'], ['front-cover', '앞가림막'], ['window', '우레탄창']]),
    group('accessories', '설치·보관', 'quantity', [['crossbar', '가로바'], ['pegs', '팩'], ['pump', '펌프'], ['bag', '가방']]),
  ]),
  category('platform', '좌대·발판', '개', [
    group('legs', '다리 구성', 'quantity', [['auto-long', '자동 롱다리'], ['auto-middle', '자동 중다리'], ['manual-long', '수동 롱다리'], ['manual-middle', '수동 중다리'], ['manual-short', '수동 숏다리'], ['inner', '속다리']]),
    group('panels', '추가판', 'quantity', [['front-panel', '앞상판'], ['rear-panel', '뒷상판'], ['wings', '날개']]),
    group('accessories', '프레임·설치 구성', 'quantity', [['frame', '전투좌대용 프레임'], ['tent-bracket', '텐트 브라켓'], ['tent-bar', '텐트바'], ['parasol-clamp', '파라솔 클램프'], ['foot', '접지발'], ['handle', '자동다리 핸들']]),
    group('bags', '보관 가방', 'multiple', [['main', '본판 가방'], ['legs', '다리 가방'], ['panels', '상판 가방'], ['frame', '프레임 가방']]),
  ]),
  category('rod-frame', '받침틀', '세트', [
    group('holders', '받침대·뒤꽂이', 'quantity', [['one-section', '1절 받침대'], ['two-section-zoom', '2절줌 받침대'], ['rear-holder', '뒤꽂이']]),
    group('configuration', '기본 부속', 'quantity', [['crank', '크랭크 (1조)'], ['cannon', '대포'], ['shelf', '선반'], ['bag', '가방']]),
    group('supports', '지지 다리', 'quantity', [['self-standing', '자립다리'], ['seop', '섶다리'], ['robot', '로봇다리 (1조)'], ['ground-spike', '땅꽂이 (1조)']]),
  ]),
  category('parasol', '파라솔', '개', [
    group('cover', '월·차양', 'quantity', [['wall', '파라솔 월'], ['screen', '가리미']]),
    group('installation', '설치·고정 구성', 'quantity', [['angle', '각도기'], ['lower-pole', '하대봉'], ['center-pole', '중간 연결봉'], ['clamp', '파라솔 클램프'], ['stand', '파라솔 스탠드'], ['ground-spike', '땅꽂이']]),
    group('storage', '보관', 'single', [['bag', '가방·보관집']]),
  ]),
  category('chair', '의자', '개', [
    group('cushions', '쿠션 구성', 'multiple', [['back', '등받이 쿠션'], ['waist', '허리 쿠션'], ['arm', '팔걸이 쿠션']]),
    group('accessories', '거치·보관 구성', 'multiple', [['shelf', '선반'], ['fan-mount', '써큘레이터 거치대'], ['bag', '의자 가방'], ['rear-bag', '후면 보조가방']]),
  ]),
  category('mat', '매트·방수포', '개', [
    group('pumps', '펌프', 'multiple', [['manual', '수동펌프'], ['electric', '전동펌프'], ['wireless', '무선 에어펌프']]),
    group('accessories', '보관·보수 구성', 'multiple', [['bag', '가방'], ['repair-kit', '보수키트'], ['groundsheet', '방수포']]),
  ]),
  category('bag', '낚시가방·케이스', '개', [
    group('trays', '트레이', 'quantity', [['tray', '수납 트레이']]),
    group('accessories', '보호·수납 구성', 'multiple', [['rod-pad', '낚시대 보호 패드'], ['inner-case', '내부 소품함']]),
  ]),
  category('heating', '난방용품', '개', [
    group('mats', '매트 구성', 'multiple', [['tent', '텐트용 매트'], ['chair', '의자용 매트']]),
    group('boiler-accessories', '보일러 부속', 'multiple', [['pump', '순환펌프'], ['car-mount', '차량용 거치대'], ['burner', '버너']]),
    group('stove-accessories', '난로 부속·보관', 'multiple', [['heat-plate', '방열판'], ['fuel-can', '기름통'], ['bag', '가방·케이스']]),
  ]),
  category('weed-cutter', '수초제거기', '개', [
    group('parts', '연장·날 구성', 'quantity', [['extension', '연장봉'], ['sickle', '수초낫'], ['saw', '수초톱'], ['bracket', '날 연결 브라켓']]),
    group('storage', '보관', 'single', [['bag', '가방']]),
  ]),
  category('landing-net', '뜰채', '개', [
    group('net', '망·보관 구성', 'multiple', [['net', '뜰채망'], ['case', '뜰채망 케이스']]),
    group('pole-parts', '연장·절번 구성', 'quantity', [['extension', '연장봉'], ['handle', '손잡이'], ['section', '규격별 절번']]),
  ]),
  category('keepnet', '살림망', '개', [
    group('storage', '보관', 'single', [['bag', '가방']]),
  ]),
  category('reel', '릴', '개', [
    group('tuning', '튜닝 부품', 'multiple', [['handle', '튜닝 핸들'], ['knob', '핸들 노브'], ['balancer', '릴 발란서']]),
    group('spares', '별도 동봉 부품', 'multiple', [['spool', '보조 스풀'], ['original-handle', '순정 핸들'], ['power-cable', '전동릴 전원 케이블']]),
    group('storage', '보관·서류', 'multiple', [['box', '박스'], ['pouch', '케이스·파우치'], ['warranty', '보증서']]),
  ]),
  category('float', '찌·케미', '개', [
    group('spares', '여분 부품·소모품', 'quantity', [['tip', '예비 찌탑'], ['battery', '건전지'], ['day-chemi', '주간 케미']]),
    group('storage', '보관', 'multiple', [['case', '찌 케이스'], ['tube', '찌통']]),
  ]),
  category('rod-rest', '받침대', '대', [
    group('storage', '보관', 'single', [['pouch', '보관집']]),
  ]),
  category('rod', '낚시대', '대', [
    group('spares', '여분 부품', 'quantity', [['tip', '여분 초릿대'], ['section', '여분 절번'], ['back-cap', '밸런스 뒷마개']]),
    group('storage', '보관·동봉 구성', 'multiple', [['case', '보관집·로드 케이스'], ['line-holder', '줄감개'], ['front-cap', '앞마개'], ['warranty', '보증서']]),
  ]),
  category('boat', '보트', '개', [
    group('fittings', '노·연결 구성', 'quantity', [['oar', '노'], ['oar-holder', '노 홀더'], ['bracket', '연결 브라켓']]),
    group('power', '동력·전원 구성', 'multiple', [['motor', '가이드모터·선외기'], ['battery', '배터리·파워뱅크'], ['charger', '충전기']]),
    group('pumps', '공기 주입', 'multiple', [['manual', '수동펌프'], ['electric', '전동펌프·송풍기']]),
  ]),
  category('electronics', '전원·전자용품', '개', [
    group('power', '전원 구성', 'multiple', [['charger', '충전기'], ['cable', '전원·충전 케이블'], ['inverter', '인버터'], ['power-bank', '보조배터리']]),
    group('accessories', '거치·보관 구성', 'multiple', [['mount', '거치대'], ['pouch', '파우치']]),
  ]),
  category('box', '태클박스·아이스박스', '개', [
    group('fittings', '거치·칸막이', 'quantity', [['rod-stand', '로드 스탠드·홀더'], ['partition', '칸막이']]),
    group('trays', '트레이', 'quantity', [['tray', '중간 트레이']]),
  ]),
  category('camping', '캠핑용품', '개', [
    group('table', '테이블 구성', 'quantity', [['extension-leg', '연장다리'], ['tablecloth', '식탁보'], ['bag', '가방']]),
    group('cookware', '조리 구성', 'quantity', [['pan', '전골팬'], ['grill', '그릴'], ['pot-stand', '그릇받침대'], ['lid', '뚜껑']]),
  ]),
  category('small-tools', '낚시소품·공구', '개', [
    group('parts', '제품별 동봉품', 'quantity', [['bait-container', '떡밥압축기 통'], ['water-cup', '물뜨개 컵'], ['throw-stick-stocking', '쏠채 스타킹']]),
    group('storage', '보관', 'single', [['pouch', '파우치']]),
  ]),
];

/** Category matching only. Existing names and IDs are retained by the import plan. */
export const equipmentCategoryDraftAliases: Readonly<Record<string, readonly string[]>> = {
  'draft-category-tent': [],
  'draft-category-platform': ['좌대', '발판', '좌대/발판'],
  'draft-category-rod-frame': ['받침틀·부속'],
  'draft-category-parasol': [],
  'draft-category-chair': [],
  'draft-category-mat': ['매트', '방수포'],
  'draft-category-bag': ['낚시가방', '낚시가방/케이스'],
  'draft-category-heating': ['난방장비'],
  'draft-category-weed-cutter': ['수초작업장비', '수초제거대'],
  'draft-category-landing-net': ['뜰채·망'],
  'draft-category-keepnet': [],
  'draft-category-reel': ['릴·전동릴', '릴/전동릴'],
  'draft-category-float': ['찌', '찌/케미'],
  'draft-category-rod-rest': [],
  'draft-category-rod': ['낚싯대'],
  'draft-category-boat': ['보트·수상좌대'],
  'draft-category-electronics': ['전원용품', '조명·전자용품'],
  'draft-category-box': ['태클박스/아이스박스'],
  'draft-category-camping': [],
  'draft-category-small-tools': ['낚시소품'],
};

export const equipmentCategoryDraftNotes: Readonly<Record<string, string>> = {
  'draft-category-tent': '롱·하프플라이를 함께 선택할 수 있습니다. 필요한 설치·바닥 구성만 제품에 적용하세요.',
  'draft-category-platform': '다리는 종류별 수량을 기록합니다. 추가판·프레임과 설치부품을 구분하세요.',
  'draft-category-rod-frame': '단수와 받침대·뒤꽂이 수량은 별개입니다. 조 단위 선택지는 1조당 금액을 입력하세요.',
  'draft-category-parasol': '월이 여러 개일 수 있습니다. 하대봉·각도기·클램프의 포함 여부를 확인하세요.',
  'draft-category-chair': '쿠션·거치대·가방 등 실제 포함된 구성만 기록하세요.',
  'draft-category-mat': '별도 동봉 펌프와 내장 기능을 구분합니다. 보일러용 매트는 난방용품에서 관리하세요.',
  'draft-category-bag': '기본 트레이와 추가 트레이를 구분해 기본 포함품을 다시 가산하지 마세요.',
  'draft-category-heating': '난로와 보일러에 필요한 그룹만 사용하세요. 본체와 매트를 별도 항목으로 넣으면 중복 가산하지 않습니다.',
  'draft-category-weed-cutter': '연장봉·날의 실제 수량과 누락 여부를 확인하세요.',
  'draft-category-landing-net': '뜰채대 단품·망 포함 세트·망 단품을 구분하세요.',
  'draft-category-keepnet': '지름·길이·재질은 제품 규격입니다. 가방 포함 여부를 확인하세요.',
  'draft-category-reel': '기어비·번수·좌우핸들은 제품 규격입니다. 장착된 튜닝품과 동봉 여분을 구분하세요.',
  'draft-category-float': '사용 배터리 규격은 동봉 수량과 다릅니다. 실제 포함된 소모품만 선택하세요.',
  'draft-category-rod-rest': '절수·줌 범위는 제품 규격입니다. 받침틀에 포함한 물건을 다시 더하지 마세요.',
  'draft-category-rod': '용품에서 직접 입력할 때의 분류입니다. 기존 칸수별 낚시대 가격표는 그대로 사용합니다.',
  'draft-category-boat': '보트와 함께 판매되는 좌대·텐트는 별도 본품 항목으로 담을 수 있습니다.',
  'draft-category-electronics': '제품에 맞는 전원·거치 구성만 적용하세요. 연결 가능한 휴대폰이 포함되는 것은 아닙니다.',
  'draft-category-box': '홀더·칸막이·트레이는 실제 수량을 기록합니다. 용량과 개폐방식은 규격입니다.',
  'draft-category-camping': '테이블·조리기구에 맞는 그룹만 사용하세요. 매트는 매트·방수포 분류로 모았습니다.',
  'draft-category-small-tools': '제품에 필요한 동봉품만 선택하고, 나머지는 직접 추가할 수 있습니다.',
};

export const equipmentCategoryDraftSources: Readonly<Record<string, readonly string[]>> = {
  'draft-category-tent': ['https://fishjoongo.com/posts/manual-1793861816152-x1gg1oBE'],
  'draft-category-platform': ['https://fishjoongo.com/posts/manual-1793079612172-UF5_cswK'],
  'draft-category-rod-frame': ['https://fishjoongo.com/posts/manual-1793504211802-Syp8savG'],
  'draft-category-parasol': ['https://fishjoongo.com/posts/170388379'],
  'draft-category-chair': ['https://fishjoongo.com/posts/manual-1793685170044-Go8tdsRe'],
  'draft-category-mat': ['https://fishjoongo.com/posts/manual-1787281442333-NDQ5r8'],
  'draft-category-bag': ['https://fishjoongo.com/posts/manual-1792036363773-Q4XVpZet'],
  'draft-category-heating': ['https://fishjoongo.com/posts/manual-1784796340688-CmiGQz'],
  'draft-category-weed-cutter': ['https://fishjoongo.com/posts/manual-1786856625928-j9oa6M'],
  'draft-category-landing-net': ['https://fishjoongo.com/posts/manual-1792999757072-3sdw7NCw'],
  'draft-category-keepnet': ['https://fishjoongo.com/posts/manual-1792998733361-75nNERz_'],
  'draft-category-reel': ['https://fishjoongo.com/posts/manual-1793774247476-0gsxmeOB'],
  'draft-category-float': ['https://fishjoongo.com/posts/manual-1792395224328-DqgYwKLm'],
  'draft-category-rod-rest': ['https://fishjoongo.com/posts/manual-1791519021224-hpw4d_p-'],
  'draft-category-rod': ['https://fishjoongo.com/posts/manual-1786952839869-PpLx3w'],
  'draft-category-boat': ['https://fishjoongo.com/posts/manual-1792902147611-SlQYrB3t'],
  'draft-category-electronics': ['https://fishjoongo.com/posts/159268702'],
  'draft-category-box': ['https://fishjoongo.com/posts/164069266'],
  'draft-category-camping': ['https://fishjoongo.com/posts/manual-1780717447068-YknwoB'],
  'draft-category-small-tools': ['https://fishjoongo.com/posts/manual-1786064969754-fNXgZN'],
};
