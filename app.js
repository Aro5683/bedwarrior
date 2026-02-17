const MASTER_SECRET = "YOUR_MASTER_SECRET_HERE";

function getDeviceID(){
  return btoa(
    navigator.userAgent +
    screen.width +
    screen.height +
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

async function generatePersonalKey(code){

  const deviceID = getDeviceID();
  const encoder = new TextEncoder();

  const hash = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(code + deviceID)
  );

  return hash;
}

async function verifyCode(){

  const code = document.getElementById("codeInput").value;

  const res = await fetch("codes.json");
  const codes = await res.json();

  const found = codes.find(c => c.code === code);

  if(!found){
    alert("Invalid Code");
    return;
  }

  if(!found.approved){
    alert("Payment Not Approved");
    return;
  }

  localStorage.setItem("userCode", code);
  alert("Code Verified. Now open your book.");
}

async function openFile(){

  const file = document.getElementById("bedxFile").files[0];
  const code = localStorage.getItem("userCode");

  if(!file || !code){
    alert("Verify code first");
    return;
  }

  const text = await file.text();
  const json = JSON.parse(text);

  const personalKeyHash = await generatePersonalKey(code);

  const masterHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(MASTER_SECRET)
  );

  const key = await crypto.subtle.importKey(
    "raw",
    masterHash,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  try{

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(json.iv)
      },
      key,
      new Uint8Array(json.data)
    );

    const blob = new Blob([decrypted], {type:"application/pdf"});
    const url = URL.createObjectURL(blob);

    document.getElementById("viewer").src = url;

  }catch(e){
    alert("Cannot open file on this device.");
  }
}
