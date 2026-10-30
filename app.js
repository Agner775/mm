import { supabase, isSupabaseConfigured } from "./supabase.js";

const money = value => "C$ " + Number(value || 0).toLocaleString("es-NI");
const grid = document.getElementById("productGrid");
const search = document.getElementById("searchInput");
const sort = document.getElementById("sortSelect");
const count = document.getElementById("resultsCount");
const empty = document.getElementById("emptyState");
let products = [];
let activeCategory = "Todos";

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
  renderProducts();
}

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function renderProducts() {
  const term = search.value.trim().toLocaleLowerCase("es");
  let visible = products.filter(p =>
    (activeCategory === "Todos" || p.category === activeCategory) &&
    [p.name,p.brand,p.category].join(" ").toLocaleLowerCase("es").includes(term)
  );
  if (sort.value === "low") visible.sort((a,b)=>Number(a.price)-Number(b.price));
  if (sort.value === "high") visible.sort((a,b)=>Number(b.price)-Number(a.price));
  if (sort.value === "name") visible.sort((a,b)=>a.name.localeCompare(b.name,"es"));
  grid.innerHTML = visible.map(p => {
    const image = p.images?.[0] || "https://placehold.co/800x600/f2f5ef/176b53?text=Electrocredit";
    return `<a class="product-card" href="producto.html?id=${encodeURIComponent(p.id)}">
      <div class="product-image-wrap">${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ""}
        <img src="${escapeHtml(image)}" alt="${escapeHtml(p.name)}" loading="lazy"><span class="card-arrow">↗</span>
      </div><div class="product-info"><span class="product-category">${escapeHtml(p.category || "Productos")}</span>
        <h3>${escapeHtml(p.name)}</h3><div class="product-bottom"><div><span class="product-brand">${escapeHtml(p.brand || "")}</span>
        <strong>${money(p.price)}</strong>${p.old_price ? `<del>${money(p.old_price)}</del>` : ""}</div><span class="view-label">Ver detalle</span></div></div></a>`;
  }).join("");
  count.textContent = `${visible.length} ${visible.length === 1 ? "producto encontrado" : "productos encontrados"}`;
  empty.hidden = visible.length !== 0;
  grid.hidden = visible.length === 0;
  renderCategories();
}

function renderCategories() {
  const categories = ["Todos", ...new Set(products.map(p=>p.category).filter(Boolean))];
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
