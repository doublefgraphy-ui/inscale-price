// ------------------------------------------------------------
// INSCALE PRICE & SPEC - CSV 자동 로딩 버전
// GitHub 저장소에 index.html / style.css / script.js / price.csv 4개 파일을 올리면 됩니다.
// 이후 카페24에서 새 CSV를 받으면 price.csv만 교체하면 사이트가 업데이트됩니다.
// ------------------------------------------------------------

const CSV_URL = "price.csv";
const IMAGE_BASE_URL = "https://inscale.co.kr/web/product/big/";

const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const brandFilter = document.getElementById("brandFilter");
const categoryFilter = document.getElementById("categoryFilter");
const displayFilter = document.getElementById("displayFilter");
const countText = document.getElementById("countText");
const emptyState = document.getElementById("emptyState");
const resetBtn = document.getElementById("resetBtn");

let allProducts = [];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (field || row.length) {
        row.push(field);
        rows.push(row);
      }
      field = "";
      row = [];
      if (char === "\r" && next === "\n") i++;
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift().map((h) => h.trim().replace(/^\uFEFF/, ""));
  return rows
    .filter((cols) => cols.some((value) => value && value.trim() !== ""))
    .map((cols) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = cols[index] ? cols[index].trim() : "";
      });
      return obj;
    });
}

function stripHTML(html) {
  return String(html || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function getSpecValue(text, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedKey}\\s*:?\\s*([^\\n]+)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function getOrigin(text) {
  const made = text.match(/Made\s+in\s+([^\n]+)/i);
  if (made) return made[1].trim();

  const origin = text.match(/Origin\s*:?\s*([^\n]+)/i);
  if (origin) return origin[1].trim();

  return "";
}

function inferCategory(name, desc) {
  const text = `${name} ${desc}`.toLowerCase();

  if (/sofa|settee|john-john|maralunga|lc2/.test(text)) return "Sofa";
  if (/chair|armchair|lounge|fauteuil|panton|wiggle/.test(text)) return "Chair";
  if (/stool|bench/.test(text)) return "Stool & Bench";
  if (/table|desk|coffee|side table|dining/.test(text)) return "Table";
  if (/lamp|light|pendant|floor lamp|wall lamp|lighting/.test(text)) return "Lighting";
  if (/mirror/.test(text)) return "Mirror";
  if (/shelf|storage|cabinet|drawer|sideboard/.test(text)) return "Storage";
  if (/rug|vase|tray|clock|accessory|acc/.test(text)) return "Living Acc";

  return "Product";
}

function normalizeImage(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `${IMAGE_BASE_URL}${value.replace(/^\/+/, "")}`;
}

function normalizeProduct(row) {
  const descHTML = row["상품 간략설명"] || "";
  const descText = stripHTML(descHTML);
  const name = row["영문 상품명"] || row["상품명"] || "";
  const brand = row["브랜드명"] || "";
  const productCode = row["상품코드"] || "";
  const price = row["판매가"] || "";
  const imagePath = row["이미지등록(상세)"] || row["이미지등록(목록)"] || row["이미지등록(축소)"] || "";

  const designer = getSpecValue(descText, "Designer");
  const material = getSpecValue(descText, "Material");
  const color = getSpecValue(descText, "Color");
  const size = getSpecValue(descText, "Size");
  const origin = getOrigin(descText);

  return {
    brand,
    name,
    productCode,
    category: inferCategory(name, descText),
    price,
    display: "확인필요",
    location: "",
    size,
    material,
    color,
    finish: "",
    designer,
    origin,
    leadtime: "",
    image: normalizeImage(imagePath),
    url: `https://inscale.co.kr/product/search.html?keyword=${encodeURIComponent(name.replace(/\s*-\s*$/, ""))}`,
    note: descText,
    searchText: [
      brand,
      name,
      productCode,
      descText,
      designer,
      material,
      color,
      size,
      origin
    ].join(" ").toLowerCase()
  };
}

function formatPrice(value) {
  const number = Number(String(value).replace(/[^0-9]/g, ""));
  if (!number) return "가격 문의";
  return `₩${number.toLocaleString("ko-KR")}`;
}

function clean(value) {
  return value === undefined || value === null || value === "" ? "-" : value;
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function specRow(label, value) {
  return `
    <div class="spec-row">
      <span>${label}</span>
      <strong>${escapeHTML(clean(value))}</strong>
    </div>
  `;
}

function renderProducts(items) {
  productList.innerHTML = "";

  items.forEach((item) => {
    const imageHTML = item.image
      ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'no-image\'>NO IMAGE</div>'">`
      : `<div class="no-image">NO IMAGE</div>`;

    productList.insertAdjacentHTML("beforeend", `
      <article class="card">
        <div class="thumb">${imageHTML}</div>

        <div class="card-body">
          <div class="meta">
            <span class="badge dark">${escapeHTML(clean(item.brand))}</span>
            <span class="badge">${escapeHTML(clean(item.category))}</span>
            <span class="badge">${escapeHTML(clean(item.display))}</span>
          </div>

          <h2 class="name">${escapeHTML(clean(item.name))}</h2>
          <p class="code">${escapeHTML(clean(item.productCode))}</p>
          <div class="price">${formatPrice(item.price)}</div>

          <div class="spec">
            ${specRow("Designer", item.designer)}
            ${specRow("Size", item.size)}
            ${specRow("Material", item.material)}
            ${specRow("Color", item.color)}
            ${specRow("Origin", item.origin)}
          </div>

          <div class="actions">
            <a class="link-primary" href="${escapeHTML(item.url)}" target="_blank" rel="noopener">홈페이지 검색</a>
            <a class="link-secondary" href="#top" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;">맨 위로</a>
          </div>
        </div>
      </article>
    `);
  });

  countText.textContent = `${items.length.toLocaleString("ko-KR")}개 상품`;
  emptyState.hidden = items.length !== 0;
}

function fillFilters(items) {
  const brands = [...new Set(items.map(item => item.brand).filter(Boolean))].sort();
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort();

  brandFilter.innerHTML = `<option value="">전체 브랜드</option>`;
  categoryFilter.innerHTML = `<option value="">전체 카테고리</option>`;

  brands.forEach((brand) => {
    brandFilter.insertAdjacentHTML("beforeend", `<option value="${escapeHTML(brand)}">${escapeHTML(brand)}</option>`);
  });

  categories.forEach((category) => {
    categoryFilter.insertAdjacentHTML("beforeend", `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`);
  });
}

function applyFilters() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedBrand = brandFilter.value;
  const selectedCategory = categoryFilter.value;
  const selectedDisplay = displayFilter.value;

  const filtered = allProducts.filter((item) => {
    const matchKeyword = !keyword || item.searchText.includes(keyword);
    const matchBrand = !selectedBrand || item.brand === selectedBrand;
    const matchCategory = !selectedCategory || item.category === selectedCategory;
    const matchDisplay = !selectedDisplay || item.display === selectedDisplay;

    return matchKeyword && matchBrand && matchCategory && matchDisplay;
  });

  renderProducts(filtered);
}

function resetFilters() {
  searchInput.value = "";
  brandFilter.value = "";
  categoryFilter.value = "";
  displayFilter.value = "";
  applyFilters();
}

async function loadCSV() {
  try {
    const response = await fetch(`${CSV_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("CSV 파일을 불러오지 못했습니다.");

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    allProducts = rows.map(normalizeProduct).filter(item => item.name || item.brand);

    fillFilters(allProducts);
    renderProducts(allProducts);
  } catch (error) {
    console.error(error);
    countText.textContent = "CSV 로딩 실패";
    productList.innerHTML = `
      <section class="empty-state">
        price.csv 파일을 찾을 수 없습니다.<br>
        GitHub 저장소에 price.csv 파일이 index.html과 같은 위치에 있는지 확인해주세요.
      </section>
    `;
  }
}

searchInput.addEventListener("input", applyFilters);
brandFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
displayFilter.addEventListener("change", applyFilters);
resetBtn.addEventListener("click", resetFilters);

loadCSV();
