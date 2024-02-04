import { CoreModule, EnumCapturedResultItemType } from 'dynamsoft-core'; 
import { CaptureVisionRouter, CapturedResultReceiver } from 'dynamsoft-capture-vision-router';
import { CameraEnhancer, CameraView, DrawingItemEvent } from 'dynamsoft-camera-enhancer';
import { MultiFrameResultCrossFilter } from 'dynamsoft-utility';
import { BarcodeResultItem } from 'dynamsoft-barcode-reader';
export * as Core from 'dynamsoft-core';
export * as License from 'dynamsoft-license';
export * as CVR from 'dynamsoft-capture-vision-router';
export * as DCE from 'dynamsoft-camera-enhancer';
export * as DBR from 'dynamsoft-barcode-reader';
export * as Utility from 'dynamsoft-utility';


CoreModule.engineResourcePaths = {
  std: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-std@1.0.0/dist/",
  dip: "https://cdn.jsdelivr.net/npm/dynamsoft-image-processing@2.0.30/dist/",
  core: "https://cdn.jsdelivr.net/npm/dynamsoft-core@3.0.32/dist/",
  license: "https://cdn.jsdelivr.net/npm/dynamsoft-license@3.0.20/dist/",
  cvr: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.0.31/dist/",
  dbr: "https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.0.20/dist/",
  dce: "https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.1/dist/"
};

class EasyBarcodeScanner{
  // static initLicense = LicenseManager.initLicense.bind(this) as typeof LicenseManager.initLicense;
  
  router: CaptureVisionRouter;
  view: CameraView;
  cameraEnhancer: CameraEnhancer;
  filter: MultiFrameResultCrossFilter;

  static async createInstance(){
    let scanner = new EasyBarcodeScanner();
    let router = scanner.router = await CaptureVisionRouter.createInstance();
    let settings = await router.getSimplifiedSettings('ReadBarcodes_SpeedFirst');
    settings.capturedResultItemTypes = EnumCapturedResultItemType.CRIT_BARCODE;
    await router.updateSettings('ReadBarcodes_SpeedFirst', settings);
    let view = scanner.view = await CameraView.createInstance();
    let cameraEnhancer = scanner.cameraEnhancer = await CameraEnhancer.createInstance(view);
    router.setInput(cameraEnhancer);
    let filter = scanner.filter = new MultiFrameResultCrossFilter();
    filter.enableResultCrossVerification(EnumCapturedResultItemType.CRIT_BARCODE, true);
    filter.enableResultDeduplication(EnumCapturedResultItemType.CRIT_BARCODE, true);
    router.addResultFilter(filter);

    return scanner;
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

