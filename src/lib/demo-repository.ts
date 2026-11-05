import { normalizeBrand, normalizeFishingRod, normalizeQuoteRecord, quoteTotals, validateQuote, type Brand, type FishingRod, type QuoteRecord } from './domain';
import { QuoteConflictError, type AppRepository, type QuoteInput } from './repository';
import { cloneEquipmentItem, createEquipmentPreset, normalizeEquipmentCategory, normalizeEquipmentProduct, validateEquipmentCategory, validateEquipmentProduct, type EquipmentCategory, type EquipmentProduct } from './equipment';

function demoEquipmentCategories(): EquipmentCategory[] {
  return (['tent','platform','stand'] as const).map((kind,index)=>{
    const category=createEquipmentPreset(kind);
    return {...category,id:`equipment-category-${kind}`,optionGroups:category.optionGroups.map(group=>({...group,choices:group.choices.map((choice,choiceIndex)=>({...choice,purchasePrice:choice.id==='missing'?0:(index+1)*(choiceIndex+1)*5000,salePrice:choice.id==='missing'?0:(index+1)*(choiceIndex+1)*8000}))}))};
  });
}
const cloneQuote=(record:QuoteRecord):QuoteRecord=>({...record,items:record.items.map(item=>item.kind==='equipment'?cloneEquipmentItem(item):({...item}))});

// This repository is reachable only in explicitly enabled development previews.
export class DemoRepository implements AppRepository {
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
  private watch(receive:()=>void){ this.listeners.add(receive);queueMicrotask(()=>{if(this.listeners.has(receive))receive();});return()=>{this.listeners.delete(receive);}; }
  watchBrands(receive:(value:Brand[])=>void){return this.watch(()=>receive([...this.brands].sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchRods(receive:(value:FishingRod[])=>void){return this.watch(()=>receive([...this.rods].sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchEquipmentCategories(receive:(value:EquipmentCategory[])=>void){return this.watch(()=>receive(this.equipmentCategories.map(value=>normalizeEquipmentCategory(value as unknown as Record<string,unknown>)).sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchEquipmentProducts(receive:(value:EquipmentProduct[])=>void){return this.watch(()=>receive(this.equipmentProducts.map(value=>normalizeEquipmentProduct(value as unknown as Record<string,unknown>)).sort((a,b)=>a.name.localeCompare(b.name,'ko'))));}
  watchQuotes(receive:(value:QuoteRecord[])=>void){return this.watch(()=>receive(this.quotes.map(cloneQuote).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))));}
  watchQuote(id:string,receive:(value:QuoteRecord|null)=>void){return this.watch(()=>{const quote=this.quotes.find(quote=>quote.id===id);receive(quote?cloneQuote(quote):null);} );}
  async createBrand(name:string){this.brands.push(normalizeBrand({id:crypto.randomUUID(),name:name.trim(),createdAt:new Date().toISOString()}));this.emit();}
  async updateBrand(id:string,name:string){this.brands=this.brands.map(brand=>brand.id===id?{...brand,name:name.trim(),updatedAt:new Date().toISOString()}:brand);this.emit();}
  async deleteBrand(id:string){this.brands=this.brands.filter(brand=>brand.id!==id);this.emit();}
  async saveRod(rod:FishingRod){const value=normalizeFishingRod(rod as unknown as Record<string,unknown>);this.rods=[...this.rods.filter(item=>item.id!==rod.id),value];this.emit();}
  async deleteRod(id:string){this.rods=this.rods.filter(rod=>rod.id!==id);this.emit();}
  async saveEquipmentCategory(value:EquipmentCategory){validateEquipmentCategory(value);this.equipmentCategories=[...this.equipmentCategories.filter(item=>item.id!==value.id),normalizeEquipmentCategory(value as unknown as Record<string,unknown>)];this.emit();}
  async deleteEquipmentCategory(id:string){this.equipmentCategories=this.equipmentCategories.filter(value=>value.id!==id);this.emit();}
  async saveEquipmentProduct(value:EquipmentProduct){validateEquipmentProduct(value);this.equipmentProducts=[...this.equipmentProducts.filter(item=>item.id!==value.id),normalizeEquipmentProduct(value as unknown as Record<string,unknown>)];this.emit();}
  async deleteEquipmentProduct(id:string){this.equipmentProducts=this.equipmentProducts.filter(value=>value.id!==id);this.emit();}
  async replaceBrands(brands:Brand[]){this.brands=brands;this.emit();}
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
