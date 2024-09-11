import { CoreModule, EnumCapturedResultItemType, Rect, DSRect, Point } from 'dynamsoft-core'; 
import { LicenseManager } from 'dynamsoft-license';
import { CaptureVisionRouter } from 'dynamsoft-capture-vision-router';
import { CameraEnhancer, CameraView, DrawingItemEvent, Feedback, DrawingStyleManager, DrawingStyle } from 'dynamsoft-camera-enhancer';
import { BarcodeResultItem } from 'dynamsoft-barcode-reader';
import { MultiFrameResultCrossFilter } from 'dynamsoft-utility';


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
  get minImageCaptureInterval(){ return (this._cvRouter as any)._minImageCaptureInterval; }
  set minImageCaptureInterval(value: number){ (this._cvRouter as any)._minImageCaptureInterval = value; }

  onFrameRead:(results:BarcodeResultItem[])=>void|any;
  onUniqueRead:(txt:string, result:BarcodeResultItem)=>void|any;


  static createInstance(): Promise<EasyBarcodeScanner>;
  static createInstance(uiPath: string): Promise<EasyBarcodeScanner>;
  static createInstance(uiElement: HTMLElement): Promise<EasyBarcodeScanner>;
  static createInstance(ui?: string | HTMLElement): Promise<EasyBarcodeScanner>;
  static async createInstance(ui?: string | HTMLElement){
    let scanner = new EasyBarcodeScanner();
    try{
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
    }catch(ex){
      scanner.dispose();
      throw ex;
    }

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
    if(!this._cameraEnhancer.isOpen()){
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
    }else if(this._cameraEnhancer.isPaused()){
      await this._cameraEnhancer.resume();
      await this._cvRouter.startCapturing(this.templateName);
    }
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
  pause(){
    this._cvRouter.stopCapturing();
    this._cameraEnhancer.pause();
  }

  turnOnTorch(){ this._cameraEnhancer.turnOnTorch(); }
  turnOffTorch(){ this._cameraEnhancer.turnOffTorch(); }
  //turnAutoTorch(){ this._cameraEnhancer.turnAutoTorch(); }

  convertToPageCoordinates(point: Point){ this._cameraEnhancer.convertToPageCoordinates(point); }
  convertToClientCoordinates(point: Point){ this._cameraEnhancer.convertToClientCoordinates(point); }

  dispose(){
    this._cvRouter?.dispose();
    let ui = this._view.getUIElement();
    this._cameraEnhancer?.dispose();
    if(this._bAddToBodyWhenOpen){
      this._bAddToBodyWhenOpen = false;
      document.body.removeChild(ui);
    }
  }
}
function scanBarcode(): Promise<string>;
function scanBarcode(uiPath: string): Promise<string>;
function scanBarcode(uiElement: HTMLElement): Promise<string>;
function scanBarcode(ui?: string | HTMLElement): Promise<string>;
async function scanBarcode(ui: string | HTMLElement = './dce.ui.html'){// TODO: use cdn url
  return await new Promise(async(rs,rj)=>{

    //========================== init ============================

    let scanner = await EasyBarcodeScanner.createInstance(ui);

    //========================== receive result ============================

    let resolveVideoScan: ()=>void;
    let pVideoScan = new Promise<void>(rs=>{resolveVideoScan = rs});
    let iRound = 0;
    // let mapResults: Map<string, BarcodeResultItem> = new Map();

    scanner.onFrameRead = r=>{
      if(r.length){
        ++iRound;
        if(2 == iRound){
          resolveVideoScan();
        }
      }
    };
    
    //========================== ui and event ============================
    let btnClose = scanner.getUIElement().shadowRoot.querySelector('.easyscanner-close-btn');
    btnClose.addEventListener('click',()=>{
      scanner.dispose();
      rs(null);
    });

    await scanner.open();

    await pVideoScan;
    //========================== success get result ============================

    scanner.pause();
    
    const result = await new Promise<string>((rs, rj) => {
      const dbrLayer = scanner._view.getDrawingLayer(2);
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

    scanner.dispose();

    // for(let item of mapResults){
    //   rs(item[1].text);
    //   return;
    // }
    rs(result);
  });
}


export { EasyBarcodeScanner, scanBarcode }

