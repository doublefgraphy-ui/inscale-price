INSCALE PRICE - LOCAL IMAGE UPDATE
Generated: 2026-08-13

이번 버전은 VITRA / ARTEK PPT에 들어있는 제품 이미지를 직접 추출해서
GitHub 저장소 내부 이미지로 불러오도록 변경한 버전입니다.

업로드/교체할 파일
- index.html
- script.js
- style.css
- vitra-stock.csv
- artek-stock.csv
- images 폴더 전체

기존 파일 중 유지
- price.csv
- cassina-stock.csv
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

반드시 유지할 폴더 구조
images/
  vitra/
  artek/

이미지 수
- Vitra: 72
- Artek: 27

Vitra 이미지가 없는 재고 행: 1
Artek 이미지가 없는 재고 행: 0

검증 결과
- PPT 하이퍼링크와 매칭 실패 Vitra: 0
- PPT 하이퍼링크와 매칭 실패 Artek: 0
- 깨진 로컬 이미지 경로: 0
- 외부 이미지 URL 잔존: 0
