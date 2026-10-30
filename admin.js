import { supabase, isSupabaseConfigured } from "./supabase.js";

const $ = id => document.getElementById(id);
let products = [];
let existingImages = [];
const money = n => "C$ " + Number(n || 0).toLocaleString("es-NI");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
$("year").textContent = new Date().getFullYear();

function message(id,text,isError=false){$(id).textContent=text;$(id).classList.toggle("error",isError);}
function showLogin(){ $("loginPanel").hidden=false; $("dashboard").hidden=true; }
function showDashboard(){ $("loginPanel").hidden=true; $("dashboard").hidden=false; }

async function checkAdmin() {
  if (!isSupabaseConfigured) {
    message("loginMessage","Primero configura la URL y la clave anon de Supabase en supabase.js.",true);
    return;
  }
  const {data:{session}} = await supabase.auth.getSession();
  if (!session) { showLogin(); return; }
  const {data:profile,error} = await supabase.from("profiles").select("is_admin").eq("id",session.user.id).maybeSingle();
  if (error || !profile?.is_admin) {
    await supabase.auth.signOut();
    showLogin();
    message("loginMessage","Esta cuenta no tiene permisos de administrador. Activa is_admin para este usuario siguiendo LEEME.txt.",true);
    return;
  }
  showDashboard(); await loadProducts();
}

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); message("loginMessage","Verificando acceso...");
  const {error}=await supabase.auth.signInWithPassword({email:$("loginEmail").value,password:$("loginPassword").value});
  if(error){message("loginMessage",error.message,true);return;}
  await checkAdmin();
});
$("logoutButton").addEventListener("click",async()=>{await supabase.auth.signOut();showLogin();});
supabase.auth.onAuthStateChange((_event,session)=>{if(!session)showLogin();});

async function loadProducts(){
  const {data,error}=await supabase.from("products").select("*").order("created_at",{ascending:false});
  if(error){message("loginMessage",error.message,true);return;}
  products=data||[];
  $("productTotal").textContent=products.length;
  $("publishedTotal").textContent=products.filter(p=>p.is_active).length;
  const cats=[...new Set(products.map(p=>p.category).filter(Boolean))];
  $("categoryOptions").innerHTML=cats.map(c=>`<option value="${escapeHtml(c)}">`).join("");
  renderList();
}
function renderList(){
  const term=$("adminSearch").value.trim().toLocaleLowerCase("es");
  const filtered=products.filter(p=>[p.name,p.brand,p.category].join(" ").toLocaleLowerCase("es").includes(term));
  $("adminProductList").innerHTML=filtered.length?filtered.map(p=>`
    <article class="admin-product-row">
      <img src="${escapeHtml(p.images?.[0]||"https://placehold.co/120x100?text=Producto")}" alt="">
      <div class="admin-product-copy"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.category)} · ${escapeHtml(p.brand||"Sin marca")}</span><b>${money(p.price)}</b></div>
      <span class="status-pill ${p.is_active?"published":"draft"}">${p.is_active?"Publicado":"Oculto"}</span>
      <button class="small-action" data-edit="${p.id}" type="button">Editar</button>
      <button class="small-action delete-action" data-delete="${p.id}" type="button">Eliminar</button>
    </article>`).join(""):'<div class="setup-notice">Todavía no hay productos. Usa “Agregar producto” para crear el primero.</div>';
  $("adminProductList").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
  $("adminProductList").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
}
$("adminSearch").addEventListener("input",renderList);

function openEditor(){ $("editorCard").hidden=false; $("editorCard").scrollIntoView({behavior:"smooth",block:"start"}); }
function closeEditor(){ $("editorCard").hidden=true; $("productForm").reset(); $("productId").value=""; existingImages=[]; $("currentImages").innerHTML=""; message("saveMessage",""); $("editorTitle").textContent="Agregar producto"; }
$("newProductButton").addEventListener("click",()=>{closeEditor();openEditor();});
$("cancelEdit").addEventListener("click",closeEditor);
$("cancelEditBottom").addEventListener("click",closeEditor);

function editProduct(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  $("productId").value=p.id;$("productName").value=p.name;$("productBrand").value=p.brand||"";
  $("productCategory").value=p.category;$("productPrice").value=p.price;$("productOldPrice").value=p.old_price??"";
  $("productBadge").value=p.badge||"";$("productDescription").value=p.description||"";
  $("productFeatures").value=(p.features||[]).join("\n");$("productActive").checked=p.is_active;
  existingImages=[...(p.images||[])];renderImagePreviews();$("editorTitle").textContent="Editar producto";openEditor();
}
function renderImagePreviews(){
  $("currentImages").innerHTML=existingImages.map((src,i)=>`<div class="image-preview"><img src="${escapeHtml(src)}" alt=""><button type="button" data-remove-image="${i}" aria-label="Quitar imagen">×</button></div>`).join("");
  $("currentImages").querySelectorAll("[data-remove-image]").forEach(b=>b.addEventListener("click",()=>{existingImages.splice(Number(b.dataset.removeImage),1);renderImagePreviews();}));
}
async function uploadSelectedImages(){
  const files=[...$("productImages").files];
  const urls=[...existingImages];
  for(const file of files){
    if(!file.type.startsWith("image/"))throw new Error("Solo puedes subir archivos de imagen.");
    if(file.size>8*1024*1024)throw new Error(`La imagen ${file.name} supera el límite de 8 MB.`);
    const safeName=file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");
    const path=`${crypto.randomUUID()}-${safeName}`;
    const {error}=await supabase.storage.from("electrocredit-products").upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw error;
    const {data}=supabase.storage.from("electrocredit-products").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
$("productForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const button=$("saveProductButton");button.disabled=true;button.textContent="Guardando...";
  try{
    const images=await uploadSelectedImages();
    const payload={
      name:$("productName").value.trim(),brand:$("productBrand").value.trim(),
      category:$("productCategory").value.trim(),price:Number($("productPrice").value),
      old_price:$("productOldPrice").value?Number($("productOldPrice").value):null,
      badge:$("productBadge").value.trim(),description:$("productDescription").value.trim(),
      features:$("productFeatures").value.split("\n").map(s=>s.trim()).filter(Boolean),
      images,is_active:$("productActive").checked
    };
    const id=$("productId").value;
    const result=id?await supabase.from("products").update(payload).eq("id",id):await supabase.from("products").insert(payload);
    if(result.error)throw result.error;
    message("saveMessage","Producto guardado correctamente.");
    await loadProducts();closeEditor();
  }catch(err){message("saveMessage",err.message||"No se pudo guardar el producto.",true);}
  finally{button.disabled=false;button.innerHTML='Guardar producto <span>→</span>';}
});
async function deleteProduct(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  if(!confirm(`¿Seguro que deseas eliminar "${p.name}"? Esta acción no se puede deshacer.`))return;
  const {error}=await supabase.from("products").delete().eq("id",id);
  if(error){alert("No se pudo eliminar: "+error.message);return;}
  await loadProducts();
}
checkAdmin();
