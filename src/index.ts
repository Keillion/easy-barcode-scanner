import { CoreModule, EnumCapturedResultItemType, Rect, DSRect } from 'dynamsoft-core'; 
import { LicenseManager } from 'dynamsoft-license';
import { CaptureVisionRouter, CapturedResultReceiver } from 'dynamsoft-capture-vision-router';
import { CameraEnhancer, CameraView, DrawingItemEvent, Feedback, DrawingStyleManager, DrawingStyle } from 'dynamsoft-camera-enhancer';
import { BarcodeResultItem } from 'dynamsoft-barcode-reader';
import { MultiFrameResultCrossFilter } from 'dynamsoft-utility';
export * as Core from 'dynamsoft-core';
export * as License from 'dynamsoft-license';
export * as CVR from 'dynamsoft-capture-vision-router';
export * as DCE from 'dynamsoft-camera-enhancer';
export * as DBR from 'dynamsoft-barcode-reader';
export * as Utility from 'dynamsoft-utility';


//The following code uses the jsDelivr CDN, feel free to change it to your own location of these files
Object.assign(CoreModule.engineResourcePaths, {
  std: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-std@1.2.10/dist/",
  dip: "https://cdn.jsdelivr.net/npm/dynamsoft-image-processing@2.2.30/dist/",
  core: "https://cdn.jsdelivr.net/npm/dynamsoft-core@3.2.30/dist/",
  license: "https://cdn.jsdelivr.net/npm/dynamsoft-license@3.2.21/dist/",
  cvr: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.2.30/dist/",
  dbr: "https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.2.10/dist/",
  dce: "https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.3/dist/"
});

if(typeof document != undefined){
  let cs = document?.currentScript;
  if(cs){
    let license = cs.getAttribute('data-license');
    if(license){ LicenseManager.license = license; }
  }
}

class EasyBarcodeScanner{
  // static initLicense = LicenseManager.initLicense.bind(this) as typeof LicenseManager.initLicense;

  static get license(){ return LicenseManager.license; }
  static set license(value: string){ LicenseManager.license = value; }

  /**
   * Presets: "ReadSingleBarcode", "ReadBarcodes_SpeedFirst"
   */
  templateName = "ReadBarcodes_SpeedFirst";
  isBeepOnUniqueRead = true;
  
  _cvRouter: CaptureVisionRouter;
  _view: CameraView;
  _cameraEnhancer: CameraEnhancer;
  _filter: MultiFrameResultCrossFilter;

  _bAddToBodyWhenOpen:boolean;

  get videoFit(){ return this._view.getVideoFit(); }
  set videoFit(value: 'contain'|'cover'){ this._view.setVideoFit(value); }

  get scanRegionMaskVisible(){ return this._view.isScanRegionMaskVisible(); }
  set scanRegionMaskVisible(value: boolean){ this._view.setScanRegionMaskVisible(value); }
  get decodedBarcodeVisible(){ return this._view._drawingLayerManager.getDrawingLayer(2).isVisible(); }
  set decodedBarcodeVisible(value: boolean){ this._view._drawingLayerManager.getDrawingLayer(2).setVisible(value); }

  onFrameRead:(results:BarcodeResultItem[])=>void|any;
  onUniqueRead:(txt:string, result:BarcodeResultItem)=>void|any;


  static createInstance(): Promise<EasyBarcodeScanner>;
  static createInstance(uiPath: string): Promise<EasyBarcodeScanner>;
  static createInstance(uiElement: HTMLElement): Promise<EasyBarcodeScanner>;
  static async createInstance(ui?: string | HTMLElement){
    let scanner = new EasyBarcodeScanner();
    let cvRouter = scanner._cvRouter = await CaptureVisionRouter.createInstance();

    // let settings = await cvRouter.getSimplifiedSettings('ReadBarcodes_SpeedFirst');
    // settings.capturedResultItemTypes = EnumCapturedResultItemType.CRIT_BARCODE;
    // await cvRouter.updateSettings('ReadBarcodes_SpeedFirst', settings);

    let view = scanner._view = await CameraView.createInstance(ui);
    let cameraEnhancer = scanner._cameraEnhancer = await CameraEnhancer.createInstance(view);
    cvRouter.setInput(cameraEnhancer);

    let filter = scanner._filter = new MultiFrameResultCrossFilter();
    filter.enableResultCrossVerification(EnumCapturedResultItemType.CRIT_BARCODE, true);
    //filter.enableResultDeduplication(EnumCapturedResultItemType.CRIT_BARCODE, true);
    cvRouter.addResultFilter(filter);

    cvRouter.addResultReceiver({
      onDecodedBarcodesReceived: (results)=>{
        let items = results.barcodeResultItems;

        try{scanner.onFrameRead && scanner.onFrameRead(items)}catch(_){}

        let hasUnique = false;
        for(let item of items){
          if(!(item as any).duplicate){
            hasUnique = true;
            try{scanner.onUniqueRead && scanner.onUniqueRead(item.text, item)}catch(_){}
          }
        }
        if(hasUnique&& scanner.isBeepOnUniqueRead){ Feedback.beep(); }
      }
    });

    return scanner;
  }

  getUIElement(){ return this._view.getUIElement(); }

  setScanRegion(region?: Rect | DSRect){
    this._cameraEnhancer.setScanRegion(region);
  }

  getScanRegionMaskStyle(){
    return this._view.getScanRegionMaskStyle();
  }
  setScanRegionMaskStyle(style: {lineWidth:number,strokeStyle:string,fillStyle:string}){
    this._view.setScanRegionMaskStyle(style);
  }
  getDecodedBarcodeStyle(){
    return DrawingStyleManager.getDrawingStyle(3);
  }
  setDecodedBarocdeStyle(value: DrawingStyle){
    DrawingStyleManager.updateDrawingStyle(3, value);
  }

  async open(){
    let ui = this._view.getUIElement();
    if(!ui.parentElement){
      Object.assign(ui.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100vw',
        height: '100vh',
      });
      document.body.append(ui);
      this._bAddToBodyWhenOpen = true;
    }
    await this._cameraEnhancer.open();
    await this._cvRouter.startCapturing(this.templateName);
  }
  close(){
    let ui = this._view.getUIElement();
    if(this._bAddToBodyWhenOpen){
      this._bAddToBodyWhenOpen = false;
      document.body.removeChild(ui);
    }
    this._cvRouter.stopCapturing();
    this._cameraEnhancer.close();
  }
}

async function scanBarcode(elementOrUrl: string | HTMLElement = './dce.ui.html'){// TODO: use cdn url
  return await new Promise(async(rs,rj)=>{

    //========================== init ============================

    let router = await CaptureVisionRouter.createInstance();
    let settings = await router.getSimplifiedSettings('ReadBarcodes_SpeedFirst');
    settings.capturedResultItemTypes = EnumCapturedResultItemType.CRIT_BARCODE;
    await router.updateSettings('ReadBarcodes_SpeedFirst', settings);
    let view = await CameraView.createInstance(elementOrUrl); 
    let cameraEnhancer = await CameraEnhancer.createInstance(view);
    router.setInput(cameraEnhancer);
    let filter = new MultiFrameResultCrossFilter();
    filter.enableResultCrossVerification(EnumCapturedResultItemType.CRIT_BARCODE, true);
    router.addResultFilter(filter);
    let ui = view.getUIElement();

    let funcDispose = ()=>{
      (self as any).mydce = cameraEnhancer;
      (self as any).myview = view;
      console.log('funcDispose')
      try{cameraEnhancer.close();}catch(_){}
      try{router.stopCapturing();}catch(_){}
      
      try{router.dispose();}catch(_){}
      try{cameraEnhancer.dispose();}catch(_){}
      try{document.body.removeChild(ui);}catch(_){}
      try{view.dispose();}catch(_){}
    };

    //========================== receive result ============================

    let resolveVideoScan: ()=>void;
    let pVideoScan = new Promise<void>(rs=>{resolveVideoScan = rs});
    let iRound = 0;
    // let mapResults: Map<string, BarcodeResultItem> = new Map();

    let capturedresultreceiver = new CapturedResultReceiver();
    capturedresultreceiver.onDecodedBarcodesReceived = r=>{
      try{
        if(r.barcodeResultItems.length){
          ++iRound;
          // for(let item of r.barcodeResultItems){
          //   mapResults.set(item.formatString+'-'+item.text, item);
          // }
          if(2 == iRound){
            resolveVideoScan();
          }
        }
      }catch(ex){
        funcDispose();
        rj(ex);
      }
    };
    router.addResultReceiver(capturedresultreceiver); //, onCapturedResultReceived: r=>{}, onOriginalImageResultReceived: r=>{}
    
    //========================== ui and event ============================
    let btnClose = ui.shadowRoot.querySelector('.easyscanner-close-btn');
    btnClose.addEventListener('click',()=>{
      funcDispose();
      rs(null);
    });
    document.body.append(ui);

    await cameraEnhancer.open();
    await router.startCapturing("ReadBarcodes_SpeedFirst");

    await pVideoScan;
    console.log('finish pVideoScan')
    //========================== success get result ============================

    cameraEnhancer.pause();
    router.stopCapturing();
    
    const result = await new Promise<string>((rs, rj) => {
      const dbrLayer = view.getDrawingLayer(2);
      const items = dbrLayer.getDrawingItems();
      if (!items.length) rj(new Error("No drawing items."));
      
      if (items.length === 1) {
        const resultText = items[0].getNote("text").content;
        rs(resultText);
      }

      items.forEach((item) => {
        item.on("mouseup", (event: DrawingItemEvent) => {
          const item = event.targetItem;
          const resultText = item.getNote("text").content;
          rs(resultText);
        });
      });
    });

    funcDispose();

    // for(let item of mapResults){
    //   rs(item[1].text);
    //   return;
    // }
    rs(result);
  });
}


export { EasyBarcodeScanner, scanBarcode }

