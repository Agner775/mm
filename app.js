import { supabase, isSupabaseConfigured } from "./supabase.js";

const money = value => "C$ " + Number(value || 0).toLocaleString("es-NI");
const grid = document.getElementById("productGrid");
const search = document.getElementById("searchInput");
const sort = document.getElementById("sortSelect");
const count = document.getElementById("resultsCount");
const empty = document.getElementById("emptyState");
let products = [];
let activeCategory = "Todos";

const todayKey = () => new Date().toISOString().slice(0,10);
function hasPromoPricing(p){ return p.old_price != null && Number(p.old_price) > Number(p.price); }
function isPromoActive(p){
  if(!hasPromoPricing(p)) return false;
  const today=todayKey();
  if(p.promo_start && today < p.promo_start) return false;
  if(p.promo_end && today > p.promo_end) return false;
  return true;
}
function displayPrice(p){ return isPromoActive(p) ? Number(p.price) : (hasPromoPricing(p) && (p.promo_start || p.promo_end) ? Number(p.old_price) : Number(p.price)); }
function interestFreeMonths(p){ const m=Number(p.interest_free_months)||0; if(![3,6,9,12].includes(m)) return 0; const t=todayKey(); if(p.interest_free_start&&t<p.interest_free_start)return 0; if(p.interest_free_end&&t>p.interest_free_end)return 0; return m; }
function discountPct(p){ return isPromoActive(p) ? Math.round((1-Number(p.price)/Number(p.old_price))*100) : 0; }

function showSetupMessage() {
  grid.innerHTML = `<div class="setup-notice"><strong>Catálogo en configuración</strong><p>La tienda está lista para conectarse. El administrador debe completar los datos de Supabase y ejecutar el archivo supabase-schema.sql.</p></div>`;
  count.textContent = "Conexión pendiente";
}

async function loadProducts() {
  if (!isSupabaseConfigured) { showSetupMessage(); return; }
  const { data, error } = await supabase.from("products")
    .select("*").eq("is_active", true).order("created_at", { ascending: false });
  if (error) {
    grid.innerHTML = `<div class="setup-notice"><strong>No se pudo cargar el catálogo</strong><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  products = data || [];
  document.getElementById("promoStrip").hidden = !products.some(isPromoActive);
  const msiProducts = products.filter(p => interestFreeMonths(p) > 0);
  const msiBanner = document.getElementById("msiBanner");
  if (msiBanner) {
    msiBanner.hidden = msiProducts.length === 0;
    if (msiProducts.length) {
      const months = [...new Set(msiProducts.map(interestFreeMonths))].sort((a,b)=>a-b);
      document.getElementById("msiBannerMonths").textContent = months.length === 1 ? `${months[0]} meses` : `${months.join(", ")} meses`;
    }
  }
  renderProducts();
  renderFeatured();
}

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function renderProducts() {
  const term = search.value.trim().toLocaleLowerCase("es");
  let visible = products.filter(p =>
    (activeCategory === "Todos" || (activeCategory === "Ofertas" ? isPromoActive(p) : (activeCategory === "Meses sin intereses" ? interestFreeMonths(p) > 0 : (activeCategory === "Destacados" ? !!p.is_featured : p.category === activeCategory)))) &&
    [p.name,p.brand,p.category].join(" ").toLocaleLowerCase("es").includes(term)
  );
  if (sort.value === "featured") visible.sort((a,b)=>Number(!!b.is_featured)-Number(!!a.is_featured));
  if (sort.value === "low") visible.sort((a,b)=>displayPrice(a)-displayPrice(b));
  if (sort.value === "high") visible.sort((a,b)=>displayPrice(b)-displayPrice(a));
  if (sort.value === "name") visible.sort((a,b)=>a.name.localeCompare(b.name,"es"));
  grid.innerHTML = visible.map(productCard).join("");
  count.textContent = `${visible.length} ${visible.length === 1 ? "producto encontrado" : "productos encontrados"}`;
  empty.hidden = visible.length !== 0;
  grid.hidden = visible.length === 0;
  renderCategories();
}

function productCard(p) {
    const image = p.images?.[0] || "https://placehold.co/800x600/f2f5ef/176b53?text=Electrocredit";
    const promo=isPromoActive(p), price=displayPrice(p), pct=discountPct(p), msi=interestFreeMonths(p);
    const stock=Number(p.stock_quantity??0);
    const stockText=stock===0?"Agotado":stock<=3?"Últimas unidades":"Disponible";
    const badge=msi ? `${msi} MESES SIN INTERESES` : (promo ? (p.badge || (pct ? `-${pct}%` : "OFERTA")) : p.badge);
    return `<a class="product-card ${promo?"promo-card":""}" href="producto.html?id=${encodeURIComponent(p.id)}">
      <div class="product-image-wrap">${p.is_featured?`<span class="featured-badge">★ DESTACADO</span>`:""}${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ""}
        <img src="${escapeHtml(image)}" alt="${escapeHtml(p.name)}" loading="lazy"><span class="card-arrow">↗</span>
      </div><div class="product-info"><span class="product-category">${escapeHtml(p.category || "Productos")}</span>
        <h3>${escapeHtml(p.name)}</h3><span class="stock-label ${stock===0?"stock-out":stock<=3?"stock-low":"stock-ok"}">${stockText}</span><div class="product-bottom"><div><span class="product-brand">${escapeHtml(p.brand || "")}</span>
        <strong>${money(price)}</strong>${promo ? `<del>${money(p.old_price)}</del>` : ""}${promo && p.promo_end ? `<small class="promo-until">Hasta ${escapeHtml(p.promo_end)}</small>`:""}</div><span class="view-label">Ver detalle</span></div></div></a>`;
  }
function renderFeatured() {
  const section=document.getElementById("featuredSection");
  const featured=products.filter(p=>p.is_featured);
  section.hidden=featured.length===0;
  document.getElementById("featuredGrid").innerHTML=featured.slice(0,4).map(productCard).join("");
}

function renderCategories() {
  const categories = ["Todos", ...(products.some(p=>p.is_featured)?["Destacados"]:[]), ...(products.some(p=>interestFreeMonths(p)>0)?["Meses sin intereses"]:[]), ...(products.some(isPromoActive)?["Ofertas"]:[]), ...new Set(products.map(p=>p.category).filter(Boolean))];
  const row = document.getElementById("categorias");
  row.innerHTML = categories.map(category =>
    `<button class="category-chip ${activeCategory===category?"active":""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}${category==="Todos"?' <span>✳</span>':""}</button>`
  ).join("");
  row.querySelectorAll("button").forEach(button => button.addEventListener("click",()=>{
    activeCategory=button.dataset.category; renderProducts();
  }));
}

search.addEventListener("input",renderProducts);
sort.addEventListener("change",renderProducts);
document.getElementById("clearFilters").addEventListener("click",()=>{
  search.value=""; sort.value="featured"; activeCategory="Todos"; renderProducts();
});
document.getElementById("year").textContent = new Date().getFullYear();
loadProducts();

const offersButton=document.getElementById("showOffersButton"); if(offersButton) offersButton.addEventListener("click",()=>{activeCategory="Ofertas"; renderProducts(); document.getElementById("catalogo").scrollIntoView({behavior:"smooth"});});

const msiButton=document.getElementById("showMsiButton"); if(msiButton) msiButton.addEventListener("click",()=>{activeCategory="Meses sin intereses"; renderProducts(); document.getElementById("catalogo").scrollIntoView({behavior:"smooth"});});

const featuredButton=document.getElementById("showFeaturedButton");
if(featuredButton) featuredButton.addEventListener("click",()=>{
  activeCategory="Destacados";search.value="";renderProducts();
  document.getElementById("catalogo").scrollIntoView({behavior:"smooth"});
});
