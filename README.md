# Easy Barcode Scanner
A wrapper for dynamsoft-barcode-reader-javascript. Easier to use.

## Create your own scanner to gain more process control.
```html
<button id="btn-scan">scan</button>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader-bundle@10.2.1000/dist/dbr.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/Keillion/easy-barcode-scanner@10.2.1000/dist/easy-barcode-scanner.js"></script>
<script>
  let pScanner, scanner;
  document.getElementById('btn-scan').addEventListener('click',async()=>{
    scanner = await (pScanner || (pScanner = EasyBarcodeScanner.createInstance()));
    scanner.onUniqueRead = (txt) => { console.log(txt); };
    await scanner.open();
  });
</script>
```

## One function directly scanning!
```html
<button id="btn-scan">scan</button>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader-bundle@10.2.1000/dist/dbr.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/Keillion/easy-barcode-scanner@10.2.1000/dist/easy-barcode-scanner.js"></script>
<script>
  document.getElementById('btn-scan').addEventListener('click',async()=>{
    let txt = await EasyBarcodeScanner.scan();
    alert(txt);
  });
</script>
```
![One function directly scanning](./one-func-direct-scan.png)
