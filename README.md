# Pazarkule KİBA · Evrak & Tahkikat Pro — PWA Sürümü

Bu klasör, verdiğiniz `evrak_tahkikat_duzeltilmis.html` dosyasının **PWA (Progressive Web App)** hâlidir.
Uygulamanın kodu, arayüzü ve işleyişi **değiştirilmedi**; yalnızca

1. Android tablet / telefon arayüzü eklendi (dokunmatik kontroller dâhil),
2. tüm dış bağımlılıklar yerelleştirildi (internet olmadan da çalışır),
3. ana ekrana kurulabilir + çevrimdışı çalışır hâle getirildi,
4. GitHub'a yüklenip GitHub Pages üzerinden yayınlanabilir yapıya getirildi.

> **PC sürümü aynı kaldı:** Masaüstünde (1024 px ve üzeri genişlik) ekran, orijinal dosyadaki
> görünümün **birebir aynısıdır**. Yeni bütün düzen kuralları yalnızca dar ekranlarda devreye girer.

---

## 1) Klasör yapısı

```
pwa/
├── index.html                ← Uygulamanın kendisi (orijinal kod + PWA etiketleri)
├── manifest.webmanifest      ← Uygulama adı, ikonlar, tam ekran (standalone) ayarları
├── sw.js                     ← Service Worker (çevrimdışı çalışma / önbellek)
├── offline.html              ← İnternet yokken gösterilecek yedek sayfa
├── pwa.css                   ← Mobil / tablet düzeni (yalnızca < 1024px'de etkin)
├── pwa-mobile.js             ← Alt sekme çubuğu, çekmece, kart listesi, dokunma kontrolleri
├── icons/                    ← Uygulama ikonları (192/512, maskable, apple-touch)
├── vendor/                   ← Yerelleştirilmiş kütüphaneler (CDN gerekmez)
│   ├── tailwind.js           ← Tailwind CSS (offline build)
│   ├── xlsx.full.min.js      ← Excel okuma/yazma (SheetJS)
│   ├── fontawesome/          ← Simge seti + font dosyaları
│   └── inter/                ← Yazı tipi (Inter) + font dosyaları
├── orijinal/                 ← Dokunulmamış orijinal HTML (yedek)
├── .nojekyll                 ← GitHub Pages'in dosyaları olduğu gibi yayınlaması için
└── .github/workflows/        ← (Opsiyonel) otomatik yayın iş akışı
```

---

## 2) Yerelde deneme (PC'de)

Service Worker ve "Ana ekrana ekle" özellikleri **http(s) üzerinden** çalışır; `index.html` dosyasına
çift tıklayarak (file://) açarsanız uygulama yine çalışır, sadece çevrimdışı önbelleği devre dışı kalır.

Basit bir yerel sunucu ile denemek için:

```bash
cd pwa
python -m http.server 8000
```

Windows'ta `sunucu-baslat.bat`, macOS/Linux'ta `./sunucu-baslat.sh` dosyasına çift tıklamanız/çalıştırmanız yeterli.
Sonra tarayıcıdan `http://localhost:8000` adresini açın.

Mobil düzeni PC'de denemek için: **F12 → Cihaz araç çubuğu (Ctrl+Shift+M) → Pixel/tablet seçin.**

---

## 2.5) `icons` klasörü — oluşturmaya gerek yok, ama nasıl yeniden üretilir?

`icons` klasörü **paketin içinde hazır geliyor**; hiçbir şey oluşturmanız gerekmez.
Zip'i açtığınızda `pwa/icons/` klasörü şu 6 dosyayla birlikte gelir:

| Dosya | Boyut | Nerede kullanılır |
|---|---|---|
| `icon-192.png` | 192×192 | Android ana ekran ikonu |
| `icon-512.png` | 512×512 | Yüksek çözünürlük / mağaza görseli |
| `maskable-192.png` | 192×192 | Android uyarlanabilir (kırpılmaz) ikon |
| `maskable-512.png` | 512×512 | Android uyarlanabilir ikon (büyük) |
| `apple-touch-icon.png` | 180×180 | iPhone / iPad ana ekran |
| `favicon-32.png` | 32×32 | Tarayıcı sekmesi simgesi |

Bu dosyalar `manifest.webmanifest` ve `index.html` içinde **zaten bu adlarla** çağrılıyor.

### GitHub'a yüklerken
`icons` klasörünü normal bir klasör gibi sürükleyip bırakabilirsiniz. GitHub web arayüzü
**boş klasör** kabul etmez; bu klasörün içinde 6 PNG olduğu için sorun çıkmaz.
Dosyaları tek tek yüklerken **adlarını değiştirmeyin** (küçük harf, tireler korunmalı).

### Kendi logonuzla değiştirmek isterseniz
Paketin yanındaki `araclar` klasöründe hazır bir üretici var:

```bash
# 1) Yerleşik kalkan simgesiyle (mavi zemin)
cd araclar
python icon-olustur.py --out ../pwa/icons

# 2) Kendi logonuzla (şeffaf zeminli PNG önerilir) + kendi renkleriniz
python icon-olustur.py --logo logo.png --bg "#1d4ed8" "#312e81" --out ../pwa/icons
```

* Windows'ta `araclar\icon-olustur.bat` dosyasına çift tıklamanız yeterli.
* Gerekli tek şey Python 3 + Pillow: `pip install pillow`
* `--bg` iki renk alır (üst → alt degrade). `maskable` ikonlarda logo, Android'in kırptığı
  kenarlardan etkilenmemesi için otomatik olarak küçültülür (%46 güvenli alan).
* Üretim sonrası `icons` klasörünü GitHub'a yeniden yükleyin; tarayıcı eski ikonu önbellekte
  tutabileceği için uygulamayı kapatıp açın (veya `sw.js` içindeki `VERSION` değerini artırın).

### İkonlar hiç görünmezse (kontrol listesi)
1. Dosya adları birebir aynı mı? (`Icon-192.PNG` değil → `icon-192.png`)
2. `icons` klasörü `index.html` ile **aynı** dizinde mi?
3. Adres çubuğunda `.../icons/icon-192.png` açılıyor mu? (404 ise yol yanlış)
4. Android'de "Ana ekrana ekle"den sonra ikon değişmediyse: uygulamayı kaldırıp yeniden kurun.

---

## 2.6) `vendor` ve `orijinal` klasörleri — hazır gelir, elle oluşturulmaz

İki klasör de paketin **içinde dolu hâlde** gelir; GitHub'da "klasör oluştur" demenize gerek yok.
GitHub, içinde dosya olan klasörleri yükleme sırasında kendisi oluşturur.

### `vendor/` — 19 dosya, ~2,5 MB (uygulamanın çevrimdışı kütüphaneleri)

```
vendor/
├── tailwind.js                     ← Tailwind CSS (CDN yerine yerel)
├── xlsx.full.min.js                ← Excel oku/yaz (SheetJS 0.18.5)
├── fontawesome/
│   ├── css/all.min.css             ← simge seti (6.4.0)
│   └── webfonts/                   ← 8 font dosyası (.woff2 + .ttf)
└── inter/
    ├── inter.css                   ← Inter yazı tipi tanımları
    └── fonts/                      ← 7 woff2 dosyası
```

`index.html` bu dosyaları **göreli** yollarla çağırır: `vendor/tailwind.js`,
`vendor/fontawesome/css/all.min.css`, `vendor/inter/inter.css`, `vendor/xlsx.full.min.js`.
`sw.js` da aynı dosyaları önbelleğe alır (çevrimdışı çalışma).

**Sıfırdan yeniden indirmek isterseniz** (`araclar` klasöründe):
```bash
cd araclar
python vendor-kur.py --out ../pwa/vendor     # Linux/macOS: ./vendor-kur.sh
```
Windows'ta `araclar\vendor-kur.bat`. Betik şunları indirir: Tailwind, SheetJS, FontAwesome
(css + 8 font) ve Google Fonts'tan Inter (css + 7 woff2) — ardından klasör yapısı pakettekiyle
birebir aynı olur. Python 3 dışında bir şey gerekmez.

### `orijinal/` — 1 dosya, 218 KB (yedek)

`orijinal/evrak_tahkikat_duzeltilmis.html`, sizin gönderdiğiniz **hiç dokunulmamış** dosyadır.
Yalnızca yedek/karşılaştırma amaçlıdır, uygulama tarafından kullanılmaz — silmeniz de sorun olmaz.
Yeniden oluşturmak için: zip içindeki dosyayı bu klasöre kopyalayın veya GitHub'da
**Add file → Upload files** ile sürükleyin.

### GitHub'a yüklemenin en kolay iki yolu

**A) Sürükle-bırak (önerilen):** zip'i bilgisayarda açın → `pwa` klasörünün **içindeki**
dosya ve klasörlerin tümünü seçin → GitHub deposunda **Add file → Upload files** alanına
sürükleyin → alt klasörler (`vendor/...`, `orijinal/...`, `icons/...`) kendiliğinden oluşur →
**Commit changes**. Not: Chrome klasör sürüklemeyi destekler; desteklemeyen tarayıcıda
tek tek klasör yükleyin (`vendor` gibi) veya Git komutunu kullanın.

**B) Git komutu (en sağlamı):**
```bash
cd pwa
git init
git add .
git commit -m "Pazarkule KIBA PWA"
git branch -M main
git remote add origin https://github.com/KULLANICI/DEPO.git
git push -u origin main
```
`git add .` boş klasör kavramı olmadığı için ne varsa (vendor, icons, orijinal dâhil) eksiksiz
gönderir. Nokta ile başlayan `.nojekyll` ve `.github` dosyaları da dâhildir.

### Yükleme sonrası 30 saniyelik doğrulama
Depoda şu üç adresi açın; hepsi görünüyorsa kurulum tamamdır:
* `.../vendor/tailwind.js`
* `.../vendor/fontawesome/webfonts/fa-solid-900.woff2`
* `.../orijinal/evrak_tahkikat_duzeltilmis.html`

Sayfa stilsiz/simgesiz görünüyorsa neredeyse her zaman sebep şudur: `vendor` klasörü
`index.html` ile aynı seviyede değil (bir üst klasörde ya da `assets/vendor` altında kalmış).
`index.html`'in yanında olmalı.

---

## 3) GitHub'a yükleme ve yayınlama (adım adım)

1. GitHub'da yeni bir depo (repository) oluşturun — örn. `pazarkule-kiba`.
   * **Public** seçin (GitHub Pages ücretsiz hesaplarda public depo ister). Gizli kalması gerekiyorsa
     GitHub Pro + private repo ile Pages açılabilir.
2. `pwa` klasörünün **içindeki** dosyaları deponun köküne yükleyin
   (`index.html` deponun kökünde olacak şekilde). `.nojekyll`, `.github` gibi nokta ile başlayan
   dosyaları da eklemeyi unutmayın.
3. Depo → **Settings → Pages**:
   * *Source:* **Deploy from a branch**
   * *Branch:* **main** · *Folder:* **/ (root)** → **Save**
4. 1–2 dakika sonra adresiniz hazır olur:
   `https://KULLANICI_ADINIZ.github.io/DEPO_ADI/`

> Otomatik yayın isterseniz: **Settings → Pages → Source: GitHub Actions** seçin.
> Depodaki `.github/workflows/deploy-pages.yml` her push'ta yayını kendisi günceller.

**Not:** Uygulama tamamen statiktir; sunucu, veritabanı veya API anahtarı gerekmez.

---

## 4) Android tablet / telefona kurulum

1. Telefon/tablet tarayıcısında (Chrome önerilir) yayın adresini açın:
   `https://KULLANICI_ADINIZ.github.io/DEPO_ADI/`
2. Kurulum için üç yol:
   * Sağ üstteki **⋮** menüsü → **Hızlı İşlemler → Ana Ekrana Ekle**
   * Chrome menüsü → **Uygulamayı yükle / Ana ekrana ekle**
   * Sayfa altında çıkan **"Uygulamayı yükle"** bildirimi
3. Uygulama, tarayıcı adres çubuğu olmadan **tam ekran** açılır ve ana ekranda ikonuyla durur.
4. İlk açılışta dosyalar önbelleğe alınır; sonrasında **internet olmadan** da açılır.

Samsung Internet / Firefox (Android) da destekler. iPhone/iPad'de Safari → Paylaş → **Ana Ekrana Ekle**.

---

## 5) Mobil / tablet arayüzünde neler var?

Masaüstü görünümü hiç değişmeden, dar ekranlarda şu ek arayüz devreye girer:

| Bölüm | Görevi |
|---|---|
| **Üst çubuk** | ☰ menü (çekmece) · modül adı · 🔍 arama · ⋮ hızlı işlemler |
| **Alt sekme çubuğu** | Evrak · Tahkikat · Memur · Notlar (klavye/mouse olmadan tek dokunuşla) |
| **＋ düğmesi (FAB)** | Bulunduğunuz modülde yeni kayıt / yeni not ekler |
| **Sol çekmece** | Orijinal sol menünün tamamı: modüller, hava durumu, saat, mini takvim ve kullanıcı menüsü |
| **⋮ hızlı işlemler** | İstatistik, Loglar, Excel Güncelle, Yedek Al, Ayarlar, Şifre Değiştir, Yardım, Çıkış |
| **Kart listesi** | Tabloların yerine, dokunmaya uygun kartlar (ilk 4 alan görünür, "Tümünü gör" ile tamamı) |

Dokunmatik kontroller:

* **Kaydırmalı sütun genişliği:** tablo başlığındaki tutamacı parmakla sürükleyin; **çift dokunuş** içeriğe sığdırır.
* **Uzun basma:** bir düğmenin/alanın görevini baloncukta gösterir (masaüstündeki `title` ipucunun karşılığı).
* **Kartlara uzun basma:** kaydı seçer (onay kutusu işaretlenir) → **Seçilenleri Sil** ile toplu silme.
* **Yapışkan notlar:** notu parmakla sürükleyin; kategori çubuğuna ya da çöp kutusuna bırakın
  (HTML5 sürükle-bırak dokunmatikte çalışmadığı için pointer tabanlı sürükleme eklendi).
* **Ses kaydı, resim/belge ekleme, notlar, kategori** gibi mevcut özellikler kartların içinden aynen çalışır.
* Formlarda **Kaydet / İptal** düğmeleri ekranın altında sabit durur; alanlar 16 px yazı tipiyle
  (iOS'ta otomatik yakınlaştırma olmadan) doldurulur.
* **Koyu tema** mobil kartlarda da tam uyumludur.
* **Yazdırma:** mobilde ekranda kartlar görünse bile yazdırma/PDF çıktısı **tablo** olarak çıkar.

---

## 6) Çevrimdışı çalışma ve güncelleme

* Bütün dosyalar ilk ziyarette `sw.js` tarafından önbelleğe alınır (`kiba-cache-kiba-pwa-v1.0.0`).
* Hava durumu gibi **dış servisler** internet ister; bağlantı yoksa "Yükleniyor..." durumunda kalır,
  uygulamanın diğer işlevlerini etkilemez.
* Uygulamada değişiklik yapıp yeniden yayınladığınızda, kullanıcılar bir sonraki açılışta
  **"Yeni sürüm hazır → Yenile"** bildirimini görür. Bildirimin doğru tetiklenmesi için
  `sw.js` içindeki `VERSION` değerini artırın (örn. `v1.0.1`) ve `CACHE` adı otomatik değişir.

---

## 7) Verileriniz nerede tutuluyor?

Uygulama verileri (evrak, tahkikat, memur, notlar, ekler) **cihazın kendi tarayıcısında**
(`localStorage` + `IndexedDB`) saklanır. Önemli sonuçlar:

* Telefon, tablet ve PC **ayrı** veri tutar; aralarında otomatik eşitleme yoktur.
* Tarayıcı verilerini/çerezleri temizlemek kayıtları da siler.
* Bu yüzden **⋮ → Yedek Al** ile düzenli yedek almanız ve gerektiğinde **Excel Güncelle / Yedek'ten geri yükle**
  ile taşımanız önerilir. (Bu davranış orijinal sürümdekiyle aynıdır.)
* Uygulamayı "Ana ekrana ekle" ile kurmak, tarayıcı geçmişini temizleme sırasında verilerin
  korunma ihtimalini artırır.

---

## 8) Yapılan teknik değişikliklerin listesi (özet)

**Değişmeyenler:** tüm iş mantığı, kayıt/çöp kutusu/Excel/yedekleme akışları, modallar, tablo çizimi,
tema ve ayarlar, kullanıcı/şifre sistemi, veri anahtarları (`localStorage`).

**Eklenenler:**

* `index.html`: PWA meta etiketleri, `manifest`, ikon bağlantıları; CDN yerine `vendor/` yolları;
  `pwa.css` ve `pwa-mobile.js` bağlantıları; `viewport-fit=cover`.
* `pwa.css`: yalnızca `< 1024px` (ve yatay telefon) için düzen; masaüstüne hiç dokunmaz.
* `pwa-mobile.js`: üst çubuk, alt sekme çubuğu, çekmece, hızlı işlemler paneli, tablodan üretilen
  dokunma dostu kart listesi, uzun basma/çift dokunma, pointer tabanlı dokunmatik sürükle-bırak,
  Service Worker kaydı ve güncelleme bildirimi. Mevcut fonksiyonlar (`switchTab`, `render*Table`,
  `openModal`, `deleteStickyNote` …) sarmalanarak kullanılır; davranışları değiştirilmez.
* `sw.js`, `manifest.webmanifest`, `offline.html`, `icons/`, `vendor/`, `.nojekyll`, `.github/workflows/`.

**Doğrulama:** Masaüstü (1440×900) ekran görüntüleri orijinal dosyayla piksel piksel karşılaştırıldı;
tek fark, canlı çalışan dijital saattir. Telefon (360/412 px), tablet (800/1024 px, dikey/yatay) ve
çevrimdışı (uçak modu) senaryoları test edildi.

---

## 9) Sık sorulanlar

**Uygulama PC'de eskisi gibi mi görünecek?** Evet. 1024 px üzeri genişlikte yeni düzen kuralları hiç uygulanmaz.

**Klavye/mouse ile kullanım bozuldu mu?** Hayır. Mevcut kısayollar (Esc vb.) ve tablo sütun genişliği
tutamaçları aynen çalışır; mobil katman bunların üzerine yalnızca *ek* yol koyar.

**İnternet olmadan açılır mı?** Evet, bir kez açıldıktan sonra (dosyalar önbelleğe alındıktan sonra).

**Farklı bir alan adı/alt klasör kullanırsam?** Tüm yollar göreli (`./vendor/...`) olduğu için
GitHub Pages alt klasöründe de sorunsuz çalışır.

**Excel dışa/içe aktarma çalışıyor mu?** Evet, SheetJS yerel dosyadan yükleniyor; çevrimdışı da çalışır.
