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
