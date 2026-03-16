
let db = JSON.parse(localStorage.getItem("alfaza_v2")) || {
bank:0,
cash:0,
tr:[]
}

updateUI()

function updateUI(){
document.getElementById("saldoBank").innerText=db.bank
document.getElementById("saldoCash").innerText=db.cash
localStorage.setItem("alfaza_v2",JSON.stringify(db))
}

function tambahTransaksi(){

let nom = prompt("Nominal transaksi")

if(!nom)return

nom=parseInt(nom)

db.cash+=nom

db.tr.push({
tgl:new Date().toISOString().split('T')[0],
nom:nom
})

updateUI()

}

function bukaLaporan(){

document.getElementById("laporanArea").style.display="block"

let total=db.tr.reduce((a,b)=>a+b.nom,0)

document.getElementById("laporanData").innerHTML="Total Penjualan : "+total

let ctx=document.getElementById('chartLaporan')

new Chart(ctx,{
type:'bar',
data:{
labels:["Penjualan"],
datasets:[{
label:"Nominal",
data:[total]
}]
}
})

}

async function shareFoto(){

const area=document.getElementById("laporanArea")

const canvas=await html2canvas(area)

canvas.toBlob(async function(blob){

const file=new File([blob],"laporan.png",{type:"image/png"})

if(navigator.share){

await navigator.share({
files:[file],
title:"Laporan Brilink"
})

}

})

}

async function sharePDF(){

const area=document.getElementById("laporanArea")

const canvas=await html2canvas(area)

const img=canvas.toDataURL("image/png")

const { jsPDF } = window.jspdf

const pdf=new jsPDF()

pdf.addImage(img,'PNG',10,10,180,0)

pdf.save("laporan.pdf")

}

function resetSaldo(){

let pin=prompt("Masukkan PIN reset")

if(pin!=="9999"){
alert("PIN salah")
return
}

db.bank=0
db.cash=0
db.tr=[]

updateUI()

alert("Saldo berhasil direset")

}
