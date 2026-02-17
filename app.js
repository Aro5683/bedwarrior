const MASTER_SECRET = "BED_SECRET_2025_PRIVATE";

function getDeviceID(){
  return btoa(
    navigator.userAgent +
    screen.width +
    screen.height +
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

function generateCode(){
  let code="";
  for(let i=0;i<16;i++){
    code+=Math.floor(Math.random()*10);
  }
  return code;
}

async function sha256(text){
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return hash;
}

async function generateFile(){

  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;

  if(!name || !phone){ alert("Enter details"); return; }

  const deviceID = getDeviceID();
  const code = generateCode();

  const masterRes = await fetch("master.bedx");
  const masterText = await masterRes.text();
  const masterJSON = JSON.parse(masterText);

  // Decrypt master
  const masterKeyHash = await sha256(MASTER_SECRET);

  const masterKey = await crypto.subtle.importKey(
    "raw",
    masterKeyHash,
    {name:"AES-GCM"},
    false,
    ["decrypt"]
  );

  const decryptedPDF = await crypto.subtle.decrypt(
    {name:"AES-GCM", iv:new Uint8Array(masterJSON.iv)},
    masterKey,
    new Uint8Array(masterJSON.data)
  );

  // Create personal key
  const personalKeyHash = await sha256(code + deviceID);

  const personalKey = await crypto.subtle.importKey(
    "raw",
    personalKeyHash,
    {name:"AES-GCM"},
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedPersonal = await crypto.subtle.encrypt(
    {name:"AES-GCM", iv},
    personalKey,
    decryptedPDF
  );

  const personalBedx = {
    iv:Array.from(iv),
    data:Array.from(new Uint8Array(encryptedPersonal)),
    code,
    deviceID,
    name,
    phone
  };

  const blob = new Blob(
    [JSON.stringify(personalBedx)],
    {type:"application/octet-stream"}
  );

  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="BEd_"+code+".bedx";
  a.click();

  document.getElementById("codeDisplay").innerHTML =
  "Your Code: <b>"+code+"</b><br>Send this to Admin & pay ₹149";

  const message =
  `Hello Admin,
Name: ${name}
Phone: ${phone}
Code: ${code}
I have paid ₹149.`;

  window.open(
    "https://wa.me/91YOURNUMBER?text="+encodeURIComponent(message),
    "_blank"
  );
}

async function verifyCode(){

  const code = document.getElementById("codeInput").value;

  const res = await fetch("codes.json");
  const codes = await res.json();

  const found = codes.find(c=>c.code===code);

  if(!found){ alert("Invalid Code"); return; }
  if(!found.approved){ alert("Payment Not Approved"); return; }

  localStorage.setItem("approvedCode", code);
  alert("Approved! Now open file.");
}

async function openFile(){

  const file = document.getElementById("fileInput").files[0];
  const approvedCode = localStorage.getItem("approvedCode");

  if(!file || !approvedCode){
    alert("Verify first");
    return;
  }

  const text = await file.text();
  const json = JSON.parse(text);

  if(json.code !== approvedCode){
    alert("Code mismatch");
    return;
  }

  if(json.deviceID !== getDeviceID()){
    alert("Device mismatch");
    return;
  }

  const personalKeyHash = await sha256(json.code + json.deviceID);

  const personalKey = await crypto.subtle.importKey(
    "raw",
    personalKeyHash,
    {name:"AES-GCM"},
    false,
    ["decrypt"]
  );

  try{
    const decrypted = await crypto.subtle.decrypt(
      {name:"AES-GCM", iv:new Uint8Array(json.iv)},
      personalKey,
      new Uint8Array(json.data)
    );

    const blob = new Blob([decrypted],{type:"application/pdf"});
    document.getElementById("viewer").src =
      URL.createObjectURL(blob);

  }catch(e){
    alert("Cannot open on this device.");
  }
}
