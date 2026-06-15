// 나중에 Google Sheet CSV 연동으로 바꿀 수 있습니다.
// 우선은 샘플 상품 데이터로 작동하는 버전입니다.

const products = [
    {
        brand: "CASSINA",
        name: "LC2 Armchair",
        category: "Armchair",
        price: 10010000,
        display: "전시중",
        location: "1F Cassina Zone",
        size: "W760 × D700 × H670 mm",
        material: "Leather, steel frame",
        color: "Black",
        finish: "Chrome frame",
        designer: "Le Corbusier, Pierre Jeanneret, Charlotte Perriand",
        origin: "Italy",
        leadtime: "12–16 weeks",
        url: "https://inscale.co.kr/",
        image: "",
        note: "매장 상담 시 가죽 등급 및 컬러 옵션 확인 필요"
    },
    {
        brand: "MUUTO",
        name: "Outline Sofa",
        category: "Sofa",
        price: 5600000,
        display: "전시중",
        location: "2F Muuto Zone",
        size: "W2200 × D840 × H710 mm",
        material: "Fabric upholstery, wood and steel frame",
        color: "Grey",
        finish: "Textile upholstery",
        designer: "Anderssen & Voll",
        origin: "Denmark",
        leadtime: "8–12 weeks",
        url: "https://inscale.co.kr/",
        image: "",
        note: "패브릭 옵션에 따라 가격 변동 가능"
    },
    {
        brand: "VITRA",
        name: "Standard Chair",
        category: "Chair",
        price: 1200000,
        display: "미전시",
        location: "창고 / 주문 상담",
        size: "W420 × D490 × H820 mm",
        material: "Wood seat and back, metal frame",
        color: "Natural Oak",
        finish: "Powder coated metal",
        designer: "Jean Prouvé",
        origin: "Germany",
        leadtime: "10–14 weeks",
        url: "https://inscale.co.kr/",
        image: "",
        note: "컬러별 재고 여부 확인 필요"
    }
];

const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const brandFilter = document.getElementById("brandFilter");
const categoryFilter = document.getElementById("categoryFilter");
const displayFilter = document.getElementById("displayFilter");
const resultCount = document.getElementById("resultCount");

function formatPrice(price){
    if(!price) return "가격 문의";
    return `₩${Number(price).toLocaleString("ko-KR")}`;
}

function valueOrDash(value){
    return value && String(value).trim() !== "" ? value : "-";
}

function createImage(item){
    if(item.image && item.image.trim() !== ""){
        return `<img src="${item.image}" alt="${item.name}">`;
    }

    return "";
}

function renderProducts(items){
    productList.innerHTML = "";
    resultCount.textContent = items.length;

    if(items.length === 0){
        productList.innerHTML = `<div class="empty">검색 결과가 없습니다.</div>`;
        return;
    }

    items.forEach(item => {
        productList.innerHTML += `
            <article class="card">
                <div class="product-image">
                    ${createImage(item)}
                </div>

                <div class="card-body">
                    <div class="meta">
                        <span>${valueOrDash(item.brand)}</span>
                        <span>${valueOrDash(item.category)}</span>
                    </div>

                    <div class="name">${valueOrDash(item.name)}</div>
                    <div class="price">${formatPrice(item.price)}</div>

                    <div class="status">
                        <span class="badge dark">${valueOrDash(item.display)}</span>
                        <span class="badge">${valueOrDash(item.location)}</span>
                    </div>

                    <div class="spec">
                        <div class="spec-title">SPEC</div>
                        <div class="spec-grid">
                            <div class="spec-label">Size</div>
                            <div class="spec-value">${valueOrDash(item.size)}</div>

                            <div class="spec-label">Material</div>
                            <div class="spec-value">${valueOrDash(item.material)}</div>

                            <div class="spec-label">Color</div>
                            <div class="spec-value">${valueOrDash(item.color)}</div>

                            <div class="spec-label">Finish</div>
                            <div class="spec-value">${valueOrDash(item.finish)}</div>

                            <div class="spec-label">Designer</div>
                            <div class="spec-value">${valueOrDash(item.designer)}</div>

                            <div class="spec-label">Origin</div>
                            <div class="spec-value">${valueOrDash(item.origin)}</div>

                            <div class="spec-label">Lead Time</div>
                            <div class="spec-value">${valueOrDash(item.leadtime)}</div>
                        </div>
                    </div>

                    ${item.note ? `<div class="note">${item.note}</div>` : ""}

                    ${item.url ? `<a class="link" href="${item.url}" target="_blank" rel="noopener">상품 페이지 보기 →</a>` : ""}
                </div>
            </article>
        `;
    });
}

function setFilterOptions(){
    const brands = [...new Set(products.map(item => item.brand).filter(Boolean))].sort();
    const categories = [...new Set(products.map(item => item.category).filter(Boolean))].sort();

    brands.forEach(brand => {
        brandFilter.innerHTML += `<option value="${brand}">${brand}</option>`;
    });

    categories.forEach(category => {
        categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
    });
}

function filterProducts(){
    const keyword = searchInput.value.toLowerCase().trim();
    const selectedBrand = brandFilter.value;
    const selectedCategory = categoryFilter.value;
    const selectedDisplay = displayFilter.value;

    const filtered = products.filter(item => {
        const searchableText = `
            ${item.brand}
            ${item.name}
            ${item.category}
            ${item.material}
            ${item.color}
            ${item.finish}
            ${item.designer}
            ${item.origin}
            ${item.location}
            ${item.note}
        `.toLowerCase();

        const matchesKeyword = searchableText.includes(keyword);
        const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
        const matchesDisplay = selectedDisplay === "all" || item.display === selectedDisplay;

        return matchesKeyword && matchesBrand && matchesCategory && matchesDisplay;
    });

    renderProducts(filtered);
}

searchInput.addEventListener("input", filterProducts);
brandFilter.addEventListener("change", filterProducts);
categoryFilter.addEventListener("change", filterProducts);
displayFilter.addEventListener("change", filterProducts);

setFilterOptions();
renderProducts(products);
