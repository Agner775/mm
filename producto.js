import { supabase, isSupabaseConfigured } from "./supabase.js";
const money = value => "C$ " + Number(value || 0).toLocaleString("es-NI", {minimumFractionDigits:2, maximumFractionDigits:2});
const id = new URLSearchParams(location.search).get("id");
const container = document.getElementById("detailContent");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.getElementById("year").textContent = new Date().getFullYear();
const WA_NUMBER = "50584458686";

async function loadProduct() {
  if (!isSupabaseConfigured) {
    container.innerHTML = '<div class="not-found"><h1>Catálogo en configuración</h1><p>El administrador debe completar la conexión a la base de datos.</p><a class="primary-button" href="index.html#catalogo">Volver al catálogo →</a></div>';
    return;
  }
  const {data:p,error} = await supabase.from("products").select("*").eq("id",id).eq("is_active",true).maybeSingle();
  if (error || !p) {
    document.getElementById("crumbName").textContent="Producto no encontrado";
    container.innerHTML='<div class="not-found"><h1>Producto no encontrado</h1><p>Este producto no está disponible o fue retirado del catálogo.</p><a class="primary-button" href="index.html#catalogo">Volver al catálogo →</a></div>';
    return;
  }
  document.title = `${p.name} | Electrocredit`;
  document.getElementById("crumbName").textContent=p.name;
  const images = p.images?.length ? p.images : ["https://placehold.co/1000x800/f2f5ef/176b53?text=Electrocredit"];
  const features = p.features || [];
  const whatsappMessage = ["¡Hola, Electrocredit! Estoy interesado en este producto:",`Producto: ${p.name}`,p.brand ? `Marca: ${p.brand}` : null,`Precio: ${money(p.price)}`,`Enlace: ${location.origin}/producto.html?id=${encodeURIComponent(p.id)}`,"¿Me pueden confirmar disponibilidad y opciones de pago?"].filter(Boolean).join("\n");
  container.innerHTML = `<div class="detail-gallery"><div class="detail-main-image"><img id="mainProductImage" src="${escapeHtml(images[0])}" alt="${escapeHtml(p.name)}"></div>
    <div class="thumbnail-row">${images.map((src,i)=>`<button class="thumbnail ${i===0?"selected":""}" data-image="${escapeHtml(src)}" aria-label="Ver fotografía ${i+1}"><img src="${escapeHtml(src)}" alt=""></button>`).join("")}</div></div>
    <div class="detail-info"><span class="product-category">${escapeHtml(p.category)}</span><p class="detail-brand">${escapeHtml(p.brand || "")}</p>
    <h1>${escapeHtml(p.name)}</h1><p class="detail-description">${escapeHtml(p.description || "")}</p>
    <div class="detail-price">${money(p.price)} ${p.old_price?`<del>${money(p.old_price)}</del>`:""}</div>
    <p class="price-note">Precio de referencia. Confirma disponibilidad y precio vigente con nuestra tienda.</p>
    <div class="detail-divider"></div><h3>Características principales</h3>
    <ul class="feature-list">${features.map(f=>`<li><span>✓</span>${escapeHtml(f)}</li>`).join("")}</ul>
    <a class="whatsapp-button" href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(whatsappMessage)}" target="_blank" rel="noopener"><span>◉</span> Consultar por WhatsApp</a>
    <p class="detail-contact-note">Escríbenos para consultar existencia, opciones de pago y entrega.</p>
    <section class="finance-card" aria-labelledby="financeTitle">
      <div class="finance-heading"><span class="finance-kicker">COMPRA A CRÉDITO</span><h2 id="financeTitle">Calcula tus cuotas</h2><p>Elige tu prima, plazo y frecuencia de pago.</p></div>
      <div class="finance-fields">
        <label for="financeDown">Prima inicial mínima C$ 1,000</label><input id="financeDown" type="number" min="1000" max="${Number(p.price)}" step="1" value="${Math.min(Number(p.price),Math.max(1000,Math.round(Number(p.price)*0.2)))}">
        <label for="financeMonths">Plazo (meses)</label><select id="financeMonths"><option value="3">3 meses</option><option value="6" selected>6 meses</option><option value="9">9 meses</option><option value="12">12 meses</option></select>
        <label for="financeFrequency">Frecuencia de pago</label><select id="financeFrequency"><option value="weekly">Semanal</option><option value="biweekly">Quincenal</option><option value="monthly" selected>Mensual</option></select>
      </div>
      <div class="finance-results" aria-live="polite"><div class="finance-total"><span>Total a pagar en cuotas</span><strong id="financeTotal"></strong></div><div class="finance-installment"><span id="financeInstallmentLabel">Cuota mensual estimada</span><strong id="financeInstallment"></strong></div></div>
      <p class="finance-disclaimer">Prima mínima: C$ 1,000. Plazo máximo: 12 meses. Estimación referencial: el 5% mensual se calcula sobre el precio de contado; después se resta la prima. Para estimar pagos semanales se consideran 4 semanas por mes y quincenales 2 pagos por mes. La aprobación, fechas, redondeos y condiciones finales deben ser confirmados por Electrocredit.</p>
      <a id="financeWhatsapp" class="whatsapp-button finance-whatsapp" href="#" target="_blank" rel="noopener">Solicitar este financiamiento por WhatsApp</a>
    </section>
    </div>`;
  document.querySelectorAll(".thumbnail").forEach(btn=>btn.addEventListener("click",()=>{
    document.getElementById("mainProductImage").src=btn.dataset.image;
    document.querySelectorAll(".thumbnail").forEach(b=>b.classList.toggle("selected",b===btn));
  }));

  const downInput=document.getElementById("financeDown"), monthsInput=document.getElementById("financeMonths"), freqInput=document.getElementById("financeFrequency");
  const calculate=()=>{
    const price=Number(p.price)||0, minimumDown=1000, down=Math.min(price,Math.max(minimumDown,Number(downInput.value)||minimumDown));
    downInput.min=String(minimumDown);
    if(price < minimumDown){ downInput.disabled=true; document.getElementById("financeWhatsapp").setAttribute("aria-disabled","true"); document.getElementById("financeTotal").textContent=""; document.getElementById("financeInstallment").textContent=""; document.getElementById("financeWhatsapp").href="#"; return; }
    downInput.disabled=false; document.getElementById("financeWhatsapp").removeAttribute("aria-disabled");
    const months=Number(monthsInput.value), freq=freqInput.value;
    const principal=price-down, interest=price*0.05*months, total=Math.max(0,price+interest-down);
    const paymentsPerMonth=freq==="weekly"?4:freq==="biweekly"?2:1;
    const count=months*paymentsPerMonth, installment=count?total/count:0;
    const label=freq==="weekly"?"Cuota semanal estimada":freq==="biweekly"?"Cuota quincenal estimada":"Cuota mensual estimada";
    document.getElementById("financeTotal").textContent=money(total);
    document.getElementById("financeInstallmentLabel").textContent=`${label} (${count} pagos)`;
    document.getElementById("financeInstallment").textContent=money(installment);
    const msg=["¡Hola, Electrocredit! Quiero solicitar información sobre financiamiento:",`Producto: ${p.name}`,p.brand?`Marca: ${p.brand}`:null,`Precio de contado: ${money(price)}`,`Prima inicial: ${money(down)}`,`Plazo: ${months} meses`,`Frecuencia: ${freq==="weekly"?"semanal":freq==="biweekly"?"quincenal":"mensual"}`,`Total estimado en cuotas: ${money(total)}`,`Cuota estimada: ${money(installment)} (${count} pagos)`,`Producto: ${location.origin}/producto.html?id=${encodeURIComponent(p.id)}`,"Deseo confirmar requisitos y aprobación."] .filter(Boolean).join("\n");
    document.getElementById("financeWhatsapp").href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  };
  [downInput,monthsInput,freqInput].forEach(el=>el.addEventListener("input",calculate));
  calculate();
}
loadProduct();
