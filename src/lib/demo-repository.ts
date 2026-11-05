import { normalizeBrand, normalizeFishingRod, normalizeQuoteRecord, quoteTotals, validateQuote, type Brand, type FishingRod, type QuoteRecord } from './domain';
import { QuoteConflictError, type AppRepository, type QuoteInput } from './repository';
import { cloneEquipmentItem, createEquipmentPreset, normalizeEquipmentCategory, normalizeEquipmentProduct, validateEquipmentCategory, validateEquipmentProduct, type EquipmentCategory, type EquipmentProduct } from './equipment';
import { activeBrands, assertBrandAvailable, assertBrandDeletable, brandDocumentId, mergedBrandIdsFor, planBrandImport, resolveBrandId, validateBrandInput, type BrandInput } from './brands';

function demoEquipmentCategories(): EquipmentCategory[] {
  return (['tent','platform','stand'] as const).map((kind,index)=>{
    const category=createEquipmentPreset(kind);
    return {...category,id:`equipment-category-${kind}`,optionGroups:category.optionGroups.map(group=>({...group,choices:group.choices.map((choice,choiceIndex)=>({...choice,purchasePrice:choice.id==='missing'?0:(index+1)*(choiceIndex+1)*5000,salePrice:choice.id==='missing'?0:(index+1)*(choiceIndex+1)*8000}))}))};
  });
}
const cloneQuote=(record:QuoteRecord):QuoteRecord=>({...record,items:record.items.map(item=>item.kind==='equipment'?cloneEquipmentItem(item):({...item}))});

// This repository is reachable only in explicitly enabled development previews.
export class DemoRepository implements AppRepository {
  constructor(private readonly options: { brandSnapshotDelayMs?: number } = {}) {}
  private brands: Brand[]=[normalizeBrand({id:'brand-1',name:'송원'}),normalizeBrand({id:'brand-2',name:'DIF'})];
  private rods: FishingRod[]=[
    normalizeFishingRod({id:'rod-1',name:'독야1',brandId:'brand-1',minValue:28,maxValue:36,purchaseLengthPrices:{28:85000,30:92000,32:100000,34:110000,36:120000},saleLengthPrices:{28:110000,30:120000,32:130000,34:140000,36:150000}}),
    normalizeFishingRod({id:'rod-2',name:'체어맨 블루',brandId:'brand-2',minValue:28,maxValue:36,purchaseLengthPrices:{28:95000,32:105000,36:115000},saleLengthPrices:{28:125000,32:135000,36:145000}}),
  ];
  private equipmentCategories=demoEquipmentCategories();
  private equipmentProducts: EquipmentProduct[]=this.equipmentCategories.map((category,index)=>({id:`equipment-product-${index+1}`,name:['샘플 텐트','샘플 좌대','샘플 받침틀'][index],categoryId:category.id,brandId:'brand-1',specification:['2인용','900 × 1200','10단'][index],unit:category.unit,purchasePrice:[100000,200000,150000][index],salePrice:[150000,300000,220000][index],optionGroups:normalizeEquipmentCategory(category as unknown as Record<string,unknown>).optionGroups}));
  private quotes: QuoteRecord[]=[normalizeQuoteRecord({id:'sample-quote',title:'김민수 매입 견적',customerName:'김민수',note:'토요일 오후 방문 예정',mode:'purchase',createdBy:'demo',createdAt:'2026-11-04T05:35:00.000Z',revision:0,items:[{fishingRodId:'rod-1',fishingRodName:'독야1',brandName:'송원',length:32,quantity:3,unitPrice:100000,rate:.7,finalUnitPrice:70000}]})];
  private listeners=new Set<()=>void>();
  private emit(){this.listeners.forEach(listener=>listener());}
  private emitBrandChange(){const delay=Math.max(0,this.options.brandSnapshotDelayMs??0);if(delay>0)setTimeout(()=>this.emit(),delay);else this.emit();}
  private watch(receive:()=>void){ this.listeners.add(receive);queueMicrotask(()=>{if(this.listeners.has(receive))receive();});return()=>{this.listeners.delete(receive);}; }
  watchBrands(receive:(value:Brand[])=>void){return this.watch(()=>receive(activeBrands(this.brands).map(brand=>({...brand,aliases:[...(brand.aliases??[])],...(brand.mergedBrandIds?{mergedBrandIds:[...brand.mergedBrandIds]}:{})})).sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchRods(receive:(value:FishingRod[])=>void){return this.watch(()=>receive(this.rods.map(rod=>({...rod,brandId:resolveBrandId(this.brands,rod.brandId)})).sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchEquipmentCategories(receive:(value:EquipmentCategory[])=>void){return this.watch(()=>receive(this.equipmentCategories.map(value=>normalizeEquipmentCategory(value as unknown as Record<string,unknown>)).sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchEquipmentProducts(receive:(value:EquipmentProduct[])=>void){return this.watch(()=>receive(this.equipmentProducts.map(value=>({...normalizeEquipmentProduct(value as unknown as Record<string,unknown>),brandId:resolveBrandId(this.brands,value.brandId)})).sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchQuotes(receive:(value:QuoteRecord[])=>void){return this.watch(()=>receive(this.quotes.map(cloneQuote).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))));}
  watchQuote(id:string,receive:(value:QuoteRecord|null)=>void){return this.watch(()=>{const quote=this.quotes.find(quote=>quote.id===id);receive(quote?cloneQuote(quote):null);} );}
  async createBrand(name:string,aliases?:readonly string[]):Promise<Brand>{const value=validateBrandInput({name,aliases});assertBrandAvailable(this.brands,value);const saved=normalizeBrand({id:brandDocumentId(value.name),...value,createdAt:new Date().toISOString()});this.brands.push(saved);this.emitBrandChange();return normalizeBrand({...saved});}
  async updateBrand(id:string,name:string,aliases?:readonly string[]):Promise<Brand>{
    const previous=this.brands.find(brand=>brand.id===id);
    if(!previous)throw new Error('삭제된 브랜드입니다. 목록을 새로 불러와주세요.');
    if(resolveBrandId(this.brands,id)!==id)throw new Error('다른 대표명에 연결된 브랜드입니다. 대표 브랜드를 수정해주세요.');
    const value=validateBrandInput({name,aliases:[...(aliases??previous.aliases??[]),...(previous.name!==name.trim()?[previous.name]:[])]});
    assertBrandAvailable(this.brands,value,id);
    const saved={...previous,...value,updatedAt:new Date().toISOString()};
    this.brands=this.brands.map(brand=>brand.id===id?saved:brand);this.emitBrandChange();
    return normalizeBrand({...saved});
  }
  async importBrands(entries:readonly BrandInput[]){
    const plan=planBrandImport(this.brands,entries);
    if(plan.conflicts)throw new Error(`브랜드 이름 또는 별칭이 겹치는 항목 ${plan.conflicts}개가 있습니다. 미리보기를 다시 확인해주세요.`);
    const now=new Date().toISOString();
    const next=[...this.brands];
    for(const entry of plan.entries){
      if(entry.action==='unchanged')continue;
      const value={name:entry.name,aliases:[...entry.aliases],updatedAt:now};
      if(entry.action==='update'&&entry.id){
        const index=next.findIndex(brand=>brand.id===entry.id);
        next[index]={...next[index],...value,...(entry.mergeIds?.length?{mergedBrandIds:mergedBrandIdsFor(this.brands,entry.id,entry.mergeIds)}:{})};
        for(const id of entry.mergeIds??[]){const source=next.findIndex(brand=>brand.id===id);next[source]={...next[source],mergedInto:entry.id,updatedAt:now};}
      }
      else if(entry.action==='create'){
        const id=brandDocumentId(entry.name);
        if(next.some(brand=>brand.id===id))throw new Error('브랜드 주소가 기존 데이터와 겹칩니다.');
        next.push({...value,id,createdAt:now});
      }
    }
    this.brands=next;this.emit();
    return {created:plan.created,updated:plan.updated,unchanged:plan.unchanged};
  }
  async deleteBrand(id:string){assertBrandDeletable(this.brands,id);this.brands=this.brands.filter(brand=>brand.id!==id);this.emit();}
  async saveRod(rod:FishingRod){const value=normalizeFishingRod(rod as unknown as Record<string,unknown>);this.rods=[...this.rods.filter(item=>item.id!==rod.id),value];this.emit();}
  async deleteRod(id:string){this.rods=this.rods.filter(rod=>rod.id!==id);this.emit();}
  async saveEquipmentCategory(value:EquipmentCategory){validateEquipmentCategory(value);this.equipmentCategories=[...this.equipmentCategories.filter(item=>item.id!==value.id),normalizeEquipmentCategory(value as unknown as Record<string,unknown>)];this.emit();}
  async deleteEquipmentCategory(id:string){this.equipmentCategories=this.equipmentCategories.filter(value=>value.id!==id);this.emit();}
  async saveEquipmentProduct(value:EquipmentProduct){validateEquipmentProduct(value);this.equipmentProducts=[...this.equipmentProducts.filter(item=>item.id!==value.id),normalizeEquipmentProduct(value as unknown as Record<string,unknown>)];this.emit();}
  async deleteEquipmentProduct(id:string){this.equipmentProducts=this.equipmentProducts.filter(value=>value.id!==id);this.emit();}
  async replaceBrands(brands:Brand[]){this.brands=brands.map(brand=>({...brand,...validateBrandInput(brand)}));this.emit();}
  async replaceRods(rods:FishingRod[]){this.rods=rods;this.emit();}
  async createQuote(input:QuoteInput){validateQuote(input);const id=crypto.randomUUID();this.quotes.push(cloneQuote({...input,...quoteTotals(input.items),id,createdBy:'demo',createdAt:new Date().toISOString(),updatedAt:null,revision:0}));this.emit();return id;}
  async updateQuote(record:QuoteRecord){
    validateQuote(record);const previous=this.quotes.find(quote=>quote.id===record.id);
    if(!previous)throw new Error('삭제된 견적입니다.');
    if(previous.revision!==record.revision)throw new QuoteConflictError();
    this.quotes=this.quotes.map(quote=>quote.id===record.id?cloneQuote({...record,...quoteTotals(record.items),createdAt:previous.createdAt,createdBy:previous.createdBy,revision:previous.revision+1,updatedAt:new Date().toISOString()}):quote);this.emit();
  }
  async deleteQuote(id:string){this.quotes=this.quotes.filter(quote=>quote.id!==id);this.emit();}
}
