import { supabase, isSupabaseConfigured } from "./supabase.js";
const money = value => "C$ " + Number(value || 0).toLocaleString("es-NI", {minimumFractionDigits:2, maximumFractionDigits:2});
const id = new URLSearchParams(location.search).get("id");
const container = document.getElementById("detailContent");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.getElementById("year").textContent = new Date().getFullYear();
const WA_NUMBER = "50584458686";
const todayKey=()=>new Date().toISOString().slice(0,10);
function hasPromoPricing(p){return p.old_price!=null && Number(p.old_price)>Number(p.price);}
function isPromoActive(p){if(!hasPromoPricing(p))return false;const t=todayKey();if(p.promo_start&&t<p.promo_start)return false;if(p.promo_end&&t>p.promo_end)return false;return true;}
function displayPrice(p){return isPromoActive(p)?Number(p.price):(hasPromoPricing(p)&&(p.promo_start||p.promo_end)?Number(p.old_price):Number(p.price));}
function interestFreeMonths(p){const m=Number(p.interest_free_months)||0;if(![3,6,9,12].includes(m))return 0;const t=todayKey();if(p.interest_free_start&&t<p.interest_free_start)return 0;if(p.interest_free_end&&t>p.interest_free_end)return 0;return m;}

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
  const promoActive=isPromoActive(p), currentPrice=displayPrice(p), msiMonths=interestFreeMonths(p);
  const stock=Number(p.stock_quantity??0);
  const stockText=stock===0?"Agotado":stock<=3?"Últimas unidades":"Disponible";
  const whatsappMessage = ["¡Hola, Electrocredit! Estoy interesado en este producto:",`Producto: ${p.name}`,p.brand ? `Marca: ${p.brand}` : null,`Precio: ${money(currentPrice)}`,`Disponibilidad publicada: ${stockText}`,`Enlace: ${location.origin}/producto.html?id=${encodeURIComponent(p.id)}`,"¿Me pueden confirmar disponibilidad y opciones de pago?"].filter(Boolean).join("\n");
  container.innerHTML = `<div class="detail-gallery"><div class="detail-main-image"><img id="mainProductImage" src="${escapeHtml(images[0])}" alt="${escapeHtml(p.name)}"></div>
    <div class="thumbnail-row">${images.map((src,i)=>`<button class="thumbnail ${i===0?"selected":""}" data-image="${escapeHtml(src)}" aria-label="Ver fotografía ${i+1}"><img src="${escapeHtml(src)}" alt=""></button>`).join("")}</div></div>
    <div class="detail-info"><span class="product-category">${escapeHtml(p.category)}</span><p class="detail-brand">${escapeHtml(p.brand || "")}</p>
    <h1>${escapeHtml(p.name)}</h1>${p.is_featured?`<span class="featured-detail-mark">★ PRODUCTO DESTACADO</span>`:""}<p class="detail-description">${escapeHtml(p.description || "")}</p>
    <p class="stock-label detail-stock ${stock===0?"stock-out":stock<=3?"stock-low":"stock-ok"}">${stockText}</p>
    <div class="detail-price">${money(currentPrice)} ${promoActive?`<del>${money(p.old_price)}</del>`:""}</div>${promoActive?`<p class="promo-detail-note">🔥 Promoción vigente${p.promo_end?` hasta ${escapeHtml(p.promo_end)}`:""}</p>`:""}${msiMonths?`<p class="promo-detail-note">✨ ${msiMonths} MESES SIN INTERESES${p.interest_free_end?` · Hasta ${escapeHtml(p.interest_free_end)}`:""}</p>`:""}
    <p class="price-note">Precio de referencia. Confirma disponibilidad y precio vigente con nuestra tienda.</p>
    <div class="detail-divider"></div><h3>Características principales</h3>
    <ul class="feature-list">${features.map(f=>`<li><span>✓</span>${escapeHtml(f)}</li>`).join("")}</ul>
    <a class="whatsapp-button" href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(whatsappMessage)}" target="_blank" rel="noopener"><span>◉</span> Consultar por WhatsApp</a>
    <p class="detail-contact-note">Escríbenos para consultar existencia, opciones de pago y entrega.</p>
    <section class="finance-card" aria-labelledby="financeTitle">
      <div class="finance-heading"><span class="finance-kicker">COMPRA A CRÉDITO</span><h2 id="financeTitle">Calcula tus cuotas</h2><p>Elige tu prima, plazo y frecuencia de pago.</p></div>
      <div class="finance-fields">
        <label for="financeDown">Prima inicial mínima C$ 1,000</label><input id="financeDown" type="number" min="1000" max="${currentPrice}" step="1" value="${Math.min(currentPrice,Math.max(1000,Math.round(currentPrice*0.2)))}">
        <label for="financeMonths">Plazo (meses)</label><select id="financeMonths">${[3,6,9,12].map(m=>`<option value="${m}" ${m===(msiMonths||6)?"selected":""}>${m} meses${m===msiMonths?" — SIN INTERESES":""}</option>`).join("")}</select>
        <label for="financeFrequency">Frecuencia de pago</label><select id="financeFrequency"><option value="weekly">Semanal</option><option value="biweekly">Quincenal</option><option value="monthly" selected>Mensual</option></select>
      </div>
      <div class="finance-results" aria-live="polite"><div class="finance-total"><span>Total a pagar en cuotas</span><strong id="financeTotal"></strong></div><div class="finance-installment"><span id="financeInstallmentLabel">Cuota mensual estimada</span><strong id="financeInstallment"></strong></div></div>
      <p class="finance-disclaimer">${msiMonths?`Promoción vigente: ${msiMonths} meses sin intereses. Si eliges otro plazo, se aplica el financiamiento normal del 5% mensual sobre el precio de contado.`:`Prima mínima: C$ 1,000. Plazo máximo: 12 meses. Estimación referencial: el 5% mensual se calcula sobre el precio de contado; después se resta la prima.`} Para estimar pagos semanales se consideran 4 semanas por mes y quincenales 2 pagos por mes. La aprobación, fechas, redondeos y condiciones finales deben ser confirmados por Electrocredit.</p>
      <a id="financeWhatsapp" class="whatsapp-button finance-whatsapp" href="#" target="_blank" rel="noopener">Solicitar este financiamiento por WhatsApp</a>
    </section>
    </div>`;
  document.querySelectorAll(".thumbnail").forEach(btn=>btn.addEventListener("click",()=>{
    document.getElementById("mainProductImage").src=btn.dataset.image;
    document.querySelectorAll(".thumbnail").forEach(b=>b.classList.toggle("selected",b===btn));
  }));

  const downInput=document.getElementById("financeDown"), monthsInput=document.getElementById("financeMonths"), freqInput=document.getElementById("financeFrequency");
  const calculate=()=>{
    const price=currentPrice||0, minimumDown=1000, down=Math.min(price,Math.max(minimumDown,Number(downInput.value)||minimumDown));
    downInput.min=String(minimumDown);
    if(price < minimumDown){ downInput.disabled=true; document.getElementById("financeWhatsapp").setAttribute("aria-disabled","true"); document.getElementById("financeTotal").textContent=""; document.getElementById("financeInstallment").textContent=""; document.getElementById("financeWhatsapp").href="#"; return; }
    downInput.disabled=false; document.getElementById("financeWhatsapp").removeAttribute("aria-disabled");
    const months=Number(monthsInput.value), freq=freqInput.value;
    const isInterestFree=msiMonths>0 && months===msiMonths;
    const principal=price-down, interest=isInterestFree?0:price*0.05*months, total=Math.max(0,price+interest-down);
    const paymentsPerMonth=freq==="weekly"?4:freq==="biweekly"?2:1;
    const count=months*paymentsPerMonth, installment=count?total/count:0;
    const label=freq==="weekly"?"Cuota semanal estimada":freq==="biweekly"?"Cuota quincenal estimada":"Cuota mensual estimada";
    document.getElementById("financeTotal").textContent=money(total);
    document.getElementById("financeInstallmentLabel").textContent=`${label} (${count} pagos)`;
    document.getElementById("financeInstallment").textContent=money(installment);
    const msg=["¡Hola, Electrocredit! Quiero solicitar información sobre financiamiento:",`Producto: ${p.name}`,p.brand?`Marca: ${p.brand}`:null,`Precio de contado: ${money(price)}`,`Prima inicial: ${money(down)}`,`Plazo: ${months} meses${isInterestFree?" SIN INTERESES":""}`,`Frecuencia: ${freq==="weekly"?"semanal":freq==="biweekly"?"quincenal":"mensual"}`,`Total estimado en cuotas: ${money(total)}`,`Cuota estimada: ${money(installment)} (${count} pagos)`,`Producto: ${location.origin}/producto.html?id=${encodeURIComponent(p.id)}`,`Disponibilidad publicada: ${stockText}`,"Deseo confirmar requisitos y aprobación."] .filter(Boolean).join("\n");
    document.getElementById("financeWhatsapp").href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  };
  [downInput,monthsInput,freqInput].forEach(el=>el.addEventListener("input",calculate));
  calculate();
}
loadProduct();
