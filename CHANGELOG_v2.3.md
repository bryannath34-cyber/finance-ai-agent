# CHANGELOG: Personal Finance AI Agent (v2.2 $\rightarrow$ v2.3)

Dokumen ini mencatat seluruh revisi teknis yang diterapkan pada [master_architecture_and_execution_plan_v2.3.md](file:///C:/Project/Finance%20AI%20Agent/master_architecture_and_execution_plan_v2.3.md) berdasarkan hasil audit teknis komprehensif (Poin 1–25, temuan baru B1–B4, dan penajaman arsitektur Poin 30–47).

---

## 1. Tabel Riwayat Perubahan per Poin Audit (1 - 47)

| No | Poin Audit / Area | Status | Sebelum (v2.2) | Sesudah (v2.3) | Alasan Teknis Singkat |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **1** | **Hak Akses `fin_bot_app`** | **Selesai** | Hak UPDATE terbatas pada kolom status; hak INSERT accounts/categories dilarang; host `'10.10.2.226'`. | • `app_users`: ditambah `UPDATE (failed_login_attempts, locked_until)`.<br>• `transaction_drafts`: kolom UPDATE diperluas mencakup nominal, akun, kategori, tanggal.<br>• `accounts` & `categories`: ditambah `INSERT` [DEFAULT].<br>• `CREATE USER` ditambah `REQUIRE SSL`.<br>• Host user diubah menjadi `'10.10.2.%'` [DEFAULT].<br>• Password diambil dari OCI Vault/env. | Memungkinkan fitur login lockout, inline edit draft, dan pembuatan akun/kategori baru dari UI. Host subnet `%` mengantisipasi pergantian VM tanpa ubah grant DB. |
| **2** | **Alur OCI Speech Asinkron** | **Selesai** | Endpoint sinkron dengan polling di dalam 1 HTTP request (timeout 30s); mengasumsikan input WAV murni. | • Endpoint dipecah asinkron: `POST /transcribe` (return `job_id` 202) dan `GET /jobs/{id}` (return status & teks). Frontend polling tiap 2-3s (timeout 90-120s).<br>• Ditambahkan konversi audio via `ffmpeg` (WebM/MP4 $\rightarrow$ WAV 16kHz mono).<br>• Pembersihan ganda via `try/finally` dan OCI bucket lifecycle rule 1 hari.<br>• Parameter `language_code` ditandai **[PERLU VERIFIKASI]**. | Menghindari timeout HTTP gateway pada audio panjang. Browser modern menghasilkan WebM/Opus, sehingga butuh konversi ke WAV sebelum dikirim ke OCI Speech. |
| **3** | **Status Verifikasi Infrastruktur** | **Selesai** | OCI Speech dan OCI GenAI berlabel "Terverifikasi Nyata". | • Diubah menjadi: "Klien terinisialisasi; belum ada smoke test fungsional".<br>• Load Balancer berstatus: "Belum dikonfigurasi (routing policy belum ditautkan)".<br>• Ditambahkan **Fase 0: Smoke Test OCI** fungsional sebelum Fase 1. | Menjaga kejujuran rekayasa: inisialisasi SDK belum membuktikan keberhasilan eksekusi job transkripsi atau inferensi chat nyata. |
| **4** | **IAM Policy Formal** | **Selesai** | Contoh policy masih menggunakan placeholder nama dan belum mencakup izin OCI Speech Service Principal. | • Ditambahkan subbagian formal IAM Policy untuk dynamic group `pf-agent-app` (Object Storage, Speech, GenAI).<br>• Placeholder `NAMA_BUCKET` dicantumkan secara konsisten. | Mencegah kegagalan otentikasi saat job mengakses resource Object Storage dan API AI native. |
| **5** | **Desain Reversal & Admin Fee** | **Selesai** | Penjelasan reversal belum memuat rumus eksplisit; belum ada constraint penghubung admin fee. | • Ditetapkan aturan [DEFAULT]: Baris reversal menyalin seluruh atribut mutasi asli, dengan `is_reversal=TRUE`, `ledger_role='REVERSAL'`, `draft_id=NULL`.<br>• Dituliskan rumus netting eksplisit per akun untuk INCOME, EXPENSE, dan TRANSFER.<br>• Reversal TRANSFER majemuk menghasilkan 2 baris pembalik yang keduanya ber-`ledger_role = 'REVERSAL'`.<br>• Ditambahkan `CONSTRAINT chk_tx_admin_fee CHECK (ledger_role <> 'ADMIN_FEE' OR parent_transaction_id IS NOT NULL)`.<br>• Ditambahkan file `sql/04_seed.sql` dan `scripts/create_user.py`. | Skrip seed dan DDL telah terbukti lolos validasi pada MySQL 8.0.46 (pengujian terpisah). |
| **6** | **Prefix Path `/finance`** | **Selesai** | Mengasumsikan `root_path` FastAPI otomatis menghapus prefix URL. | • Dijelaskan fakta teknis OCI LB meneruskan path apa adanya (*as-is*).<br>• Seluruh router FastAPI dibungkus prefix `/finance/api/...`, static mount di `/finance/static`, health probe di `/finance/api/health`.<br>• Frontend menggunakan dynamic base path. | Menjamin aplikasi dapat diakses di balik sub-path Load Balancer tanpa merusak routing API atau aset statis. |
| **7** | **Proxy Headers Uvicorn** | **Selesai** | Perintah jalankan Uvicorn belum menyertakan argumen proxy headers. | • Uvicorn dijalankan dengan `--proxy-headers --forwarded-allow-ips=<IP_LB>`.<br>• Dimasukkan ke dalam file unit systemd `deploy/personal-finance.service`. | Memastikan IP asli klien terbaca dari `X-Forwarded-For` untuk rate limiting dan skema HTTPS terbaca untuk cookie `Secure`. |
| **8** | **Load Balancer Bersama Portal** | **Selesai** | Aturan routing menggunakan pola fuzzy `/finance*` tanpa langkah backup. | • Ditambahkan langkah backup konfigurasi listener Portal.<br>• Kondisi routing diperketat menggunakan sintaks OCI LB: `any(http.request.url.path eq '/finance', http.request.url.path sw '/finance/')` dan ditandai **[PERLU VERIFIKASI]** untuk sintaks persis console. | Mencegah Load Balancer membelokkan URL lain yang mirip (misal `/finance-lainnya`) dan menjaga Portal tetap berjalan normal. |
| **9** | **Checklist Jaringan Lengkap** | **Selesai** | Belum merinci aturan Security List, Gateway, dan firewall OS. | • Ditambahkan checklist: Ingress port 8000 dari LB, Egress 443 via NAT Gateway (Osaka), Service Gateway (Singapore OSN).<br>• Ditambahkan konfigurasi `firewalld` port 8000 dan SELinux policy di Oracle Linux 10. | Menjamin paket data tidak terblokir baik di level virtual network OCI maupun firewall lokal VM. |
| **10** | **Akses DB dari Laptop (Fase 2)** | **Selesai** | Belum menjelaskan cara pengujian lokal terhadap DB privat. | • Ditambahkan panduan SSH port-forwarding via OCI Bastion managed session (`ssh -i <PRIVATE_KEY_PATH> -N -L 3307:10.10.2.202:3306 ...`) untuk laptop pengembang. | Menjembatani keterbatasan bahwa laptop tidak bisa langsung mengakses private IP subnet OCI. |
| **11** | **File Trigger Terpisah** | **Selesai** | Trigger disatukan di DDL utama dengan sintaks `DELIMITER` yang rentan gagal di driver ORM. | • Trigger dipisahkan ke `sql/02_triggers.sql`.<br>• Dicatat bahwa `DELIMITER` hanya dikenali via klien CLI `mysql` atau MySQL Shell mode SQL (bukan PyMySQL/SQLAlchemy).<br>• Dicatat verifikasi hak `TRIGGER` untuk user `taskadmin`. | Mencegah kegagalan parsing script DDL jika dieksekusi via driver PyMySQL/SQLAlchemy. |
| **12** | **Standardisasi Zona Waktu** | **Selesai** | Penjelasan zona waktu belum mengikat `transaction_date` dan `expires_at`. | • Seluruh `DATETIME` disimpan UTC (`SET time_zone = '+00:00';` pada connection pool).<br>• `transaction_date` menggunakan zona waktu lokal user (`Asia/Jakarta`).<br>• `expires_at` dihitung `UTC_TIMESTAMP() + INTERVAL 15 MINUTE`. | Menjamin sinkronisasi waktu antara server cloud, database, dan kalender bisnis lokal pengguna. |
| **13** | **Penyimpanan State Rate Limiting** | **Selesai** | Belum menetapkan arsitektur penyimpanan counter rate limiting. | • Ditetapkan [DEFAULT]: 1 worker Uvicorn dengan counter in-memory sliding window.<br>• Dicatat batasannya: jika worker dinaikkan > 1 di masa depan, state harus dipindah ke tabel DB atau Redis. | Solusi sederhana dan hemat resource untuk v1 tanpa perlu menginstal Redis server terpisah. |
| **14** | **Validasi Output LLM & Keamanan Prompt** | **Selesai** | Validasi output AI masih deskripsi konseptual. | • Wajib validasi JSON dengan schema Pydantic.<br>• Resolusi nama akun/kategori ke ID database pengguna (dilarang percaya ID dari LLM).<br>• Injeksi tanggal & zona waktu hari ini ke prompt.<br>• Parser fallback deterministik untuk angka lokal (*"50rb"*, *"1,5jt"*).<br>• Sanitasi prompt injection dengan delimitasi ketat dan penolakan nominal <= 0 atau > 1 triliun. | Mencegah eksploitasi prompt injection, halusinasi nama akun/kategori, dan kesalahan kalkulasi tanggal relatif. |
| **15** | **Konfirmasi Batch Atomik** | **Selesai** | Belum merinci penguncian baris database saat konfirmasi draft. | • Menggunakan query `SELECT ... FOR UPDATE` pada baris draft batch dalam 1 transaksi DB.<br>• Memvalidasi seluruh baris berstatus `PENDING` dan belum `EXPIRED`.<br>• Menegaskan `UNIQUE (draft_id, ledger_role)` sebagai pengaman terakhir. | Mencegah race condition jika pengguna menekan tombol konfirmasi berkali-kali secara simultan. |
| **16** | **Kebijakan Saldo Negatif** | **Selesai** | Belum ada keputusan penanganan saldo minus. | • Ditetapkan [DEFAULT]: Saldo negatif diizinkan di database, namun UI menampilkan peringatan (*warning alert*). | Mengakomodasi realitas pencatatan keuangan pribadi di mana pengeluaran sering dicatat sebelum uang masuk sempat di-input. |
| **17** | **Nilai ENUM `system_audit_logs`** | **Selesai** | Nilai event_type audit log masih sangat terbatas. | • Ditambahkan nilai ENUM: `LOGIN_SUCCESS`, `LOGOUT`, `RATE_LIMITED`, `REVERSAL_CREATED`, `BATCH_CONFIRMED`. | Menyediakan jejak audit yang lengkap untuk siklus hidup sesi dan peristiwa finansial penting. |
| **18** | **Cakupan Fitur Fase 7 (Lanjutan)** | **Selesai** | Tabel anggaran, target tabungan, dan simulasi pembelian belum memiliki alur implementasi yang jelas di v1. | • Ditetapkan [DEFAULT]: Tabel tetap dibuat di DDL awal, namun antarmuka dan servicenya dialihkan ke **Fase 7 (Lanjutan)**.<br>• Struktur proyek disesuaikan (menandai `budget_router.py`, `goals_router.py`, `scenario_router.py`). | Memastikan tim fokus menuntaskan siklus pencatatan multi-transaksi, suara, dan buku besar (MVP) terlebih dahulu. |
| **19** | **Penghapusan Kolom yang Tidak Relevan** | **Selesai** | Tabel `app_users` masih memuat kolom opsional eksternal non-web. | • Kolom eksternal non-web dan constraint terkait dihapus total dari `app_users` [DEFAULT]. | Menghilangkan artefak masa lalu karena sistem kini 100% berfokus pada antarmuka Web App. |
| **20** | **Klarifikasi MySQL HeatWave** | **Selesai** | Muncul kerancuan apakah butuh cluster HeatWave analytics. | • Ditambahkan catatan resmi: Beban kerja OLTP aplikasi ini hanya membutuhkan **MySQL DB System** standar; cluster HeatWave analitik tidak dibutuhkan dan menambah biaya sewa. | Mencegah biaya sewa cloud yang tidak perlu. |
| **21** | **Penyempurnaan Struktur Proyek** | **Selesai** | Belum ada direktori deploy, skrip utilitas, dan file seed. | • Ditambahkan folder `deploy/` (`service`, `routing_rules`, `firewall`).<br>• Ditambahkan folder `scripts/` (`smoke_test_oci.py`, `create_user.py`, `seed_categories.py`).<br>• Ditambahkan file `sql/04_seed.sql` dan file uji `tests/test_security_idor.py`. | Struktur direktori dan skrip DDL/seed telah terbukti lolos validasi pada MySQL 8.0.46; struktur proyek diformalkan di Bagian 6. |
| **22** | **Skenario Pengujian Fase 6** | **Selesai** | Pengujian Fase 6 masih berupa tes fungsional umum. | • Ditambahkan 9 skenario pengujian konkret: Double-confirm paralel, Expired draft guard & batch kosong, IDOR lintas user, CSRF violation, Rate limit & lockout, Reversal transfer majemuk, Relative date parser (termasuk contoh: *"Beli bensin 50rb bca, makan 30rb gopay, tf 100rb bca ke gopay admin 1000"*), Speech timeout handling, dan Immutability draft status. | Menjamin kualitas keamanan dan ketepatan kalkulasi akuntansi sebelum serah terima. |
| **23** | **Penomoran Komentar DDL** | **Selesai** | Tabel 1-11 meloncat nomornya karena trigger diberi nomor 7. | • Tabel 1 hingga 11 bernomor urut konsisten.<br>• Trigger dipisahkan dengan judul tersendiri di `sql/02_triggers.sql`. | Kerapian dokumentasi dan kejelasan bagi DBA. |
| **24** | **Perbaikan Sintaks Mermaid** | **Selesai** | Label edge Mermaid memuat tanda kurung tanpa tanda kutip. | • Seluruh label edge dengan tanda kurung diberi tanda kutip ganda (misal: `|"Instance Principals (Cross-Region)"|`). | Mencegah kegagalan render diagram pada markdown previewer. |
| **25** | **Versi Dokumen v2.3 & Riwayat** | **Selesai** | Judul dokumen masih v2.2 dan belum ada tabel riwayat versi. | • Judul dinaikkan menjadi **v2.3**.<br>• Ditambahkan tabel "Riwayat Revisi Dokumen" di bagian atas. | Penandaan versi formal sesuai kaidah dokumen arsitektur enterprise. |
| **26** | **IAM Policy OCI Speech & GenAI (B1)** | **Selesai** | Policy `Allow service aispeech...` diasumsikan wajib; GenAI diberi izin `in tenancy`. | • Policy Service Principal `aispeech` ditandai **[PERLU VERIFIKASI]** untuk diuji empiris di Fase 0 (hanya ditambahkan jika terbukti butuh).<br>• Policy GenAI dibatasi pada `compartment OCI-Training`.<br>• Dicatat bahwa seluruh policy didefinisikan pada Home Region. | Menghindari pemberian policy berlebih yang tidak dibutuhkan serta menjaga prinsip hak istimewa terkecil. |
| **27** | **Sanitasi Tag HTML Mermaid (B2)** | **Selesai** | Diagram memuat raw text `<NAMA_BUCKET>` yang berisiko terhapus sebagai HTML tag. | • Diganti menjadi teks polos `NAMA_BUCKET` pada flowchart node dan sequence diagram participant. | Memastikan diagram Mermaid dirender sempurna tanpa glitch teks hilang. |
| **28** | **Spesifikasi Detail Speech Pipeline (B3)** | **Selesai** | Batasan audio, proteksi multi-tenant, dan status storage belum terperinci. | • Ditetapkan durasi maks 30 detik & ukuran maks 5 MB.<br>• Validasi MIME type ketat.<br>• Rate limiting khusus transkripsi.<br>• State job disimpan in-memory [DEFAULT] dengan verifikasi `user_id == current_user.id` (Anti-IDOR) pada `GET /jobs/{id}`.<br>• Rute VM ke OCI Speech via Service Gateway ditandai **[PERLU VERIFIKASI]** dengan NAT sebagai fallback. | Mencegah kebocoran data transkripsi antar-pengguna dan melindungi biaya API Speech OCI. |
| **29** | **Pembersihan Riwayat Revisi & Sterilisasi Non-Web (B4)** | **Selesai** | Terdapat asumsi riwayat lama yang tidak bersumber dari data dan penyebutan artefak non-web. | • Tabel riwayat versi dibersihkan dari tanggal/kronologi spekulatif dan diganti `[Diisi pemilik dokumen]`.<br>• Seluruh dokumen arsitektur disterilkan dari referensi Telegram sehingga 100% fokus pada Web SPA. | Menjaga keabsahan faktual dokumen teknis arsitektur. |
| **30** | **Perbaikan Kolom `opening_balance_date` & Tipe `EWALLET` pada `sql/04_seed.sql`** | **Selesai** | `opening_balance_date` belum terisi pada INSERT accounts; tipe akun e-wallet ditulis `'E_WALLET'`. | `opening_balance_date` ditambahkan dan diisi `CURDATE()` (mematuhi constraint NOT NULL); tipe diganti `'EWALLET'` sesuai ENUM DDL. | Menghindari syntax/constraint error saat script dieksekusi di MySQL 8. |
| **31** | **Eksklusivitas Provisioning User via `scripts/create_user.py`** | **Selesai** | Terdapat query INSERT user pertama dengan password hash palsu di `sql/04_seed.sql`. | INSERT user dihapus dari seed.sql; user pertama dibuat HANYA via `scripts/create_user.py` menggunakan akun admin `taskadmin` (bukan `fin_bot_app`), menginisialisasi user, 3 rekening awal, 8 kategori umum, dan kategori sistem "Biaya Admin" dalam satu transaksi atomik. | Mencegah akun administrator dengan password dummy dan memastikan Argon2id di-generate runtime. |
| **32** | **Trigger `trg_drafts_validate_update` pada `transaction_drafts`** | **Selesai** | Belum ada trigger yang menjaga integritas pembaruan status dan data bisnis pada `transaction_drafts`. | Ditambahkan trigger BEFORE UPDATE di `sql/02_triggers.sql`: kolom bisnis hanya boleh diubah jika `OLD.status = 'PENDING'`, dan status final (`CONFIRMED`, `CANCELLED`, `EXPIRED`) tidak dapat diubah lagi. | Mengunci draft yang telah masuk buku besar atau dibatalkan agar tidak bisa dimanipulasi dari celah aplikasi. |
| **33** | **Skenario Uji 9 Immutability Draft pada Fase 6** | **Selesai** | Pengujian Fase 6 belum mencakup pengujian penolakan update terhadap draft yang telah berstatus final. | Ditambahkan skenario uji ke-9 di Fase 6 yang membuktikan query UPDATE pada draft `CONFIRMED`/`CANCELLED`/`EXPIRED` ditolak oleh trigger DB. | Memverifikasi ketahanan data buku besar dari modifikasi draft paska-konfirmasi. |
| **34** | **Penanganan Status `EXPIRED` & Batch Kosong pada `confirm-batch`** | **Selesai** | Draft kedaluwarsa ditandai CANCELLED dan belum ada penanganan jika batch draft kosong. | Draft kedaluwarsa ditandai `'EXPIRED'` dalam transaksi DB terpisah yang di-COMMIT sebelum mengembalikan HTTP 400; batch kosong (0 baris) mengembalikan HTTP 404 Not Found. | Memberikan status audit yang tepat antara pembatalan manual (CANCELLED) vs kedaluwarsa sistem (EXPIRED). |
| **35** | **Jalur Utama Static Build FFmpeg dengan Verifikasi Checksum** | **Selesai** | Opsi EPEL dan static build disajikan setara. | Static build binary resmi John Van Sickle dengan verifikasi checksum MD5 (`ffmpeg-release-amd64-static.tar.xz.md5`) dijadikan jalur utama resmi; opsi EPEL ditandai **[PERLU VERIFIKASI]**. | Menghindari kegagalan deploy karena paket `ffmpeg` sering kali tidak tersedia di repo default Enterprise Linux 10 / EPEL. Verifikasi checksum diselaraskan hanya memakai MD5 sesuai file rilis resmi. |
| **36** | **Relokasi Aplikasi ke `/opt/personal-finance-agent` & SELinux Hardening** | **Selesai** | Aplikasi ditempatkan di `/home/opc/personal-finance-agent` dan mencantumkan `setsebool httpd_can_network_connect`. | Lokasi dipindahkan ke `/opt/personal-finance-agent` (menghindari blokir systemd SELinux pada direktori home); ditambahkan perintah `semanage fcontext` dan `restorecon`; klaim `httpd_can_network_connect` dikoreksi/dihapus karena tidak relevan untuk standalone Uvicorn. | Mencegah kegagalan start service systemd akibat pelanggaran AVC denial SELinux. |
| **37** | **Verifikasi CIDR Subnet Load Balancer & Uvicorn Compatibility** | **Selesai** | CIDR `10.10.1.0/24` diasumsikan pasti valid pada security list dan flag `--forwarded-allow-ips`. | Ditandai **[PERLU VERIFIKASI]** untuk CIDR subnet LB nyata dan kompatibilitas notasi CIDR pada versi Uvicorn VM (fallback: IP privat LB individual). | Mencegah error argumen CLI Uvicorn jika versi terpasang tidak mendukung subnet CIDR. |
| **38** | **Verifikasi Sertifikat CA TLS MySQL DB System OCI** | **Selesai** | Diasumsikan file `/etc/pki/tls/certs/ca-bundle.crt` langsung memvalidasi sertifikat TLS DB System. | Ditandai **[PERLU VERIFIKASI]** bahwa CA default OS belum tentu mengenali sertifikat internal DB System OCI; dijelaskan opsi unduh CA OCI khusus atau require-SSL `check_hostname=False` untuk staging. | Mencegah kegagalan handshake TLS saat aplikasi menghubungkan pool SQLAlchemy ke database cloud. |
| **39** | **Otentikasi Kunci Privat Bastion & Penyeragaman Prefix API** | **Selesai** | Perintah SSH Bastion belum menyertakan argumen `-i <PRIVATE_KEY_PATH>`; masih ada placeholder HTML entity `&lt;NAMA_BUCKET&gt;`; terdapat inkonsistensi URL `/finance/api/v1/...`. | Ditambahkan `-i <PRIVATE_KEY_PATH>` pada perintah Bastion; seluruh placeholder diseragamkan menjadi `NAMA_BUCKET` polos; seluruh prefix API diseragamkan menjadi `/finance/api/...` (tanpa `v1`). | Memastikan perintah SSH tunnel dapat dieksekusi pengembang dan routing API konsisten tanpa versi url redundant. |
| **40** | **Timeout Transkripsi Backend-Driven & Ekstraksi SQL Docker** | **Selesai** | Frontend yang memegang kendali timeout dan pembersihan audio; instruksi Docker mengasumsikan file SQL sudah ada di disk. | Pembersihan audio dan penandaan status `TIMEOUT` dipicu oleh backend background task setelah 90 detik; pada instruksi Docker Subbagian 4.5 ditambahkan langkah eksplisit mengekstrak blok SQL ke folder `sql/`. | Menjaga keandalan pembersihan storage di cloud meskipun browser ditutup pengguna. |
| **41** | **Alur Konfirmasi Batch Parsial & Pembatalan Draft per Baris** | **Selesai** | Alur confirm-batch menolak jika ada draft CANCELLED, meng-update seluruh baris batch tanpa filter PENDING, dan hanya menandai draft lewat waktu sebagai EXPIRED. | • Langkah 3c mengabaikan baris CANCELLED (fitur batalkan per baris). Tolak (HTTP 409) hanya bila ada draft CONFIRMED/EXPIRED dalam batch atau jika tidak ada satu pun draft PENDING.<br>• Langkah 4: `UPDATE ... WHERE batch_id=:b AND user_id=:u AND status='PENDING'`.<br>• Langkah 5-6: Terbitkan transaksi buku besar HANYA untuk draft yang baru dikonfirmasi pada transaksi ini.<br>• Langkah 3b: Tandai SEMUA draft PENDING di batch sebagai EXPIRED (dalam transaksi terpisah yang di-COMMIT), lalu HTTP 400. | Mendukung fleksibilitas UI membatalkan satu draft tanpa menggugurkan seluruh batch, menjamin integritas buku besar hanya untuk draft yang sah dikonfirmasi, dan menyeragamkan status kedaluwarsa draft dalam satu batch. |
| **42** | **Skenario 10 Pengujian E2E Pembatalan Sebagian Draft per Baris** | **Selesai** | Hanya terdapat 9 skenario pengujian di Fase 6. | Ditambahkan Skenario Uji ke-10: Batch 3 draft dengan 1 draft dibatalkan per baris lalu klik *Confirm All*; ekspektasi 2 draft CONFIRMED, 1 tetap CANCELLED, 2 atau 3 baris ledger terbit sesuai admin fee tanpa error. Judul diperbarui menjadi "(10 Skenario Uji)". | Memvalidasi ketahanan backend terhadap mutasi draft berstatus campuran (PENDING dan CANCELLED) saat konfirmasi batch massal. |
| **43** | **Validasi Method PATCH pada Middleware Anti-CSRF** | **Selesai** | Middleware CSRF hanya memvalidasi method POST, PUT, DELETE. | Ditambahkan method `PATCH` ke dalam daftar method mutasi yang wajib memvalidasi token CSRF (`POST`, `PUT`, `PATCH`, `DELETE`). | Endpoint update parsial (seperti pembatalan draf individual per baris atau edit inline) lazim menggunakan method PATCH dan wajib terlindungi dari serangan CSRF. |
| **44** | **Standardisasi Penulisan Reversal (`ledger_role = 'REVERSAL'`)** | **Selesai** | Deskripsi reversal majemuk di Fase 3 poin 1 dan Fase 6 skenario 6 menyebut "menghasilkan dua baris reversal (PRIMARY dan ADMIN_FEE)". | Diperjelas bahwa seluruh baris jurnal pembalik selalu ber-`ledger_role = 'REVERSAL'` dan `is_reversal = TRUE`. Objek yang dibalik adalah baris asli PRIMARY dan ADMIN_FEE via `reverses_transaction_id`. | Menyelaraskan teks narasi arsitektur dengan constraint ENUM DDL dan mencegah salah paham pengembang backend. |
| **45** | **Dependensi `policycoreutils-python-utils` & Verifikasi AVC SELinux `bin_t`** | **Selesai** | Perintah `semanage` ditulis langsung tanpa dependensi utilitas, dan label `bin_t` belum ditandai uji audit log AVC. | Ditambahkan instalasi `policycoreutils-python-utils` sebelum mengeksekusi `semanage`. Label SELinux `bin_t` ditandai **[PERLU VERIFIKASI]** dan dimasukkan ke daftar uji Fase 0 via `sudo ausearch -m avc -ts recent`. | Perintah `semanage` tidak terpasang secara default pada instalasi minimal Oracle Linux 10, dan penetapan label venv di direktori `/opt` harus diuji agar tidak memicu AVC denial pada service systemd. |
| **46** | **Kebijakan Service Principal `objectstorage-ap-singapore-1` untuk OLM** | **Selesai** | Dokumen belum memuat policy IAM untuk Service Principal Object Storage regional saat membuat lifecycle rule. | Ditambahkan policy `Allow service objectstorage-ap-singapore-1 to manage object-family in compartment OCI-Training` pada Bagian 2.B dan catatan verifikasi IAM ke-3. | Menghindari error `InsufficientServicePermissions` saat membuat aturan lifecycle rule penghapusan otomatis 1 hari di konsol OCI. |
| **47** | **Panduan Konseptual "Why & How" & Hasil Verifikasi Faktual Fase 0** | **Selesai** | Penjelasan mendalam tentang mengapa dan bagaimana arsitektur terhubung (Osaka, DB privat, Speech, LB) belum dikelompokkan secara konseptual. | Ditambahkan Subbagian 1.2 "Panduan Konseptual: Mengapa dan Bagaimana Setiap Komponen Bekerja (Why & How)" mencakup 5 pilar arsitektur; diperbarui status faktual OCI Speech (`language_code='id'`, status SUCCEEDED 5 detik, tanpa policy aispeech), OCI GenAI (`CohereChatRequest`), dan Subnet LB (`10.10.1.0/24`). | Memberikan pemahaman pedagogis yang lengkap agar pengembang dapat membangun ulang sistem secara mandiri dari awal dengan pemahaman arsitektur yang kokoh. |

---

## 2. Laporan Hasil Validasi Mandiri (Aturan Kerja No. 4)

Laporan ini menyajikan evaluasi analitis mendalam terhadap skrip DDL dan perancangan sistem:

1. **Integritas Relasi & Foreign Key (FK):**
   - **Status Evaluasi:** **Konsisten secara Analitis.**
   - Seluruh Foreign Key pada 11 tabel relasional mengacu langsung ke kolom yang memiliki `PRIMARY KEY` atau `UNIQUE constraint` majemuk:
     * `web_sessions.user_id` $\rightarrow$ `app_users(id)`
     * `accounts.user_id` $\rightarrow$ `app_users(id)`
     * `categories.user_id` $\rightarrow$ `app_users(id)`
     * `transaction_drafts.(source_account_id, user_id)` $\rightarrow$ `accounts(id, user_id)` (Unique Key `uq_accounts_id_user`)
     * `transaction_drafts.(destination_account_id, user_id)` $\rightarrow$ `accounts(id, user_id)` (Unique Key `uq_accounts_id_user`)
     * `transaction_drafts.(category_id, user_id)` $\rightarrow$ `categories(id, user_id)` (Unique Key `uq_categories_id_user`)
     * `transactions.(draft_id, user_id)` $\rightarrow$ `transaction_drafts(id, user_id)` (Unique Key `uq_drafts_id_user`)
     * `transactions.(parent_transaction_id, user_id)` $\rightarrow$ `transactions(id, user_id)` (Unique Key `uq_transactions_id_user`)
     * `transactions.(reverses_transaction_id, user_id)` $\rightarrow$ `transactions(id, user_id)` (Unique Key `uq_transactions_id_user`)
     * `category_budgets.(category_id, user_id)` $\rightarrow$ `categories(id, user_id)` (Unique Key `uq_categories_id_user`)
     * `savings_goals.(dedicated_account_id, user_id)` $\rightarrow$ `accounts(id, user_id)` (Unique Key `uq_accounts_id_user`)
     * `purchase_scenarios.(target_account_id, user_id)` $\rightarrow$ `accounts(id, user_id)` (Unique Key `uq_accounts_id_user`)
     * `system_audit_logs.user_id` $\rightarrow$ `app_users(id)`

2. **Kesesuaian Aturan MySQL 8 CHECK Constraint & Triggers:**
   - **Status Evaluasi:** **Mematuhi Standar SQL MySQL 8.0.16+.**
   - Tidak ada subquery ke tabel eksternal di dalam klausa `CHECK`. Seluruh logika pemeriksaan menggunakan operator boolean lokal:
     * `chk_drafts_amount`: `(amount > 0)`
     * `chk_drafts_admin_fee`: `(admin_fee >= 0)`
     * `chk_drafts_consistency`: percabangan logika kesesuaian akun sumber, tujuan, dan kategori.
     * `chk_tx_amount`: `(amount > 0)`
     * `chk_tx_consistency`: integritas baris buku besar.
     * `chk_tx_reversal_state`: pemisahan baris normal (`draft_id IS NOT NULL`) dan pembalik (`draft_id NULL`).
     * `chk_tx_admin_fee`: `(ledger_role <> 'ADMIN_FEE' OR parent_transaction_id IS NOT NULL)`.
   - **Trigger Integritas:**
     * `trg_tx_validate_draft_status`: menjamin transaksi hanya diterbitkan dari draft berstatus CONFIRMED milik user yang sama.
     * `trg_drafts_validate_update`: menjamin immutability draft paska-konfirmasi/pembatalan dan menjaga perubahan data hanya saat status PENDING.

3. **Validitas Sintaks Diagram Mermaid:**
   - **Status Evaluasi:** **Valid & Bebas Sintaks Error.**
   - Seluruh label edge dengan tanda kurung dibungkus tanda kutip ganda `|"..."|`.
   - Seluruh placeholder HTML telah disanitasi menjadi `NAMA_BUCKET` polos.

> *Catatan Pengujian Nyata:* Validasi di atas adalah hasil telaah sintaksis analitis. Untuk pengujian empiris tanpa menyentuh database cloud produksi, telah disediakan panduan eksekusi lokal pada **Subbagian 4.5 (Instruksi Pengujian Docker MySQL 8)**.

---

## 3. Daftar Keputusan [DEFAULT] yang Diambil

Berikut adalah 7 keputusan default yang telah diadopsi ke dalam dokumen arsitektur v2.3:

1. **Hak Akses Master Akun/Kategori (Poin 1):** Diberikan hak `INSERT` pada tabel `accounts` dan `categories` kepada user runtime `fin_bot_app` agar pengguna dapat menambah rekening bank/e-wallet dan kategori baru dari antarmuka Web UI.
2. **Host Database User (Poin 1):** Host user database ditetapkan sebagai `'10.10.2.%'` (bukan IP tunggal VM), agar tidak perlu melakukan migrasi grant database jika instans VM diperbarui atau di-redeploy di subnet privat yang sama.
3. **Mekanisme Reversal Identik (Poin 5):** Reversal menyalin seluruh atribut mutasi asli secara identik (`type`, `amount`, `source`, `destination`, `category`) dengan flag `is_reversal=TRUE`, `ledger_role='REVERSAL'`, dan `draft_id=NULL`. Saldo dihitung menggunakan formula pengurangan (*netting*), menjaga jejak audit akuntansi tanpa membalik kolom arah akun.
4. **Rate Limiting In-Memory (Poin 13):** Dijalankan pada 1 worker Uvicorn dengan counter in-memory sliding window untuk kesederhanaan arsitektur awal tanpa dependensi Redis server tambahan.
5. **Kebijakan Saldo Negatif (Poin 16):** Database mengizinkan saldo akun bernilai minus, namun UI menampilkan peringatan visual (*warning alert*) yang jelas.
6. **Penjadwalan Fitur Anggaran & Tabungan (Poin 18):** Tabel `monthly_budgets`, `category_budgets`, `savings_goals`, dan `purchase_scenarios` tetap dibuat di DDL awal, namun antarmuka dan servicenya dialokasikan pada **Fase 7 (Lanjutan)** agar tim fokus menyelesaikan siklus pencatatan multi-transaksi terlebih dahulu.
7. **Penyimpanan Status Job Suara (Poin 28):** Disimpan di memory dictionary backend (1 worker) dengan pencatatan `user_id` pemilik untuk proteksi anti-IDOR dan pembersihan otomatis job > 15 menit.

---

## 4. Daftar Item [PERLU VERIFIKASI] (Wajib Dicek pada Fase 0)

Berikut adalah 9 item yang tidak boleh diasumsikan dan wajib diverifikasi secara empiris di lingkungan OCI:

1. **`language_code` Bahasa Indonesia pada OCI Speech Whisper:**
   - *Isu:* Apakah model `WHISPER_MEDIUM` menerima kode ISO `"id"`, `"ind"`, atau `"auto"`?
   - *Langkah Verifikasi:* Dijalankan di VM `app-01` pada Fase 0 via `scripts/smoke_test_oci.py` dengan submit job uji audio pendek.
2. **Tipe Request Python SDK untuk Cohere Command A di OCI GenAI:**
   - *Isu:* Menentukan apakah inferensi chat model `cohere.command-a-03-2025` di region Osaka menggunakan kelas `CohereChatRequest`, `CohereChatRequestV2`, atau `GenericChatRequest`.
   - *Langkah Verifikasi:* Dijalankan di VM `app-01` via `smoke_test_oci.py` dengan uji inferensi satu prompt chat sederhana.
3. **Kebutuhan Policy Service Principal `aispeech`:**
   - *Isu:* Apakah OCI Speech membutuhkan policy service eksplisit untuk membaca/menulis bucket `NAMA_BUCKET` jika job di-submit atas nama Instance Principals VM?
   - *Langkah Verifikasi:* Diuji di Fase 0 dengan menjalankan job Whisper tanpa policy service terlebih dahulu.
4. **Rute Jaringan Privat VM ke OCI Speech:**
   - *Isu:* Memastikan apakah panggilan API Speech di region Singapore dapat melintasi Service Gateway (OSN) atau memerlukan NAT Gateway sebagai fallback.
   - *Langkah Verifikasi:* Diuji konektivitasnya dari VM `app-01` saat eksekusi `smoke_test_oci.py`.
5. **Sintaks Kondisi Routing Policy OCI Load Balancer:**
   - *Isu:* Sintaks persis pemetaan path pada console OCI LB: `any(http.request.url.path eq '/finance', http.request.url.path sw '/finance/')`.
   - *Langkah Verifikasi:* Dikonfirmasi di OCI Console menu Networking $\rightarrow$ Load Balancer $\rightarrow$ Routing Policies.
6. **Ketersediaan Paket `ffmpeg` di Oracle Linux 10:**
   - *Isu:* Paket `ffmpeg` kemungkinan tidak ada di repo default OL 10. Jalur utama telah ditetapkan menggunakan binary static build resmi John Van Sickle dengan verifikasi checksum MD5.
   - *Langkah Verifikasi:* Diperiksa via `dnf info ffmpeg` di VM `app-01` pada Fase 0 jika ingin membandingkan opsi RPM repo.
7. **Privilege `TRIGGER` User `taskadmin`:**
   - *Isu:* Memastikan user `taskadmin` di MySQL DB System memiliki privilege untuk membuat trigger database dan parameter `log_bin_trust_function_creators`.
   - *Langkah Verifikasi:* Diverifikasi saat eksekusi file `sql/02_triggers.sql` pada Fase 1.
8. **CIDR Subnet Load Balancer & Uvicorn CIDR Support:**
   - *Isu:* Memverifikasi CIDR subnet Load Balancer aktual serta memastikan apakah versi Uvicorn di VM mendukung notasi CIDR pada argumen `--forwarded-allow-ips` (fallback: daftar IP tunggal LB).
   - *Langkah Verifikasi:* Diuji via argumen CLI Uvicorn di VM `app-01` pada Fase 0.
9. **Sertifikat CA TLS MySQL DB System OCI:**
   - *Isu:* Menentukan apakah koneksi SSL SQLAlchemy di VM mengenali CA bundle OS `/etc/pki/tls/certs/ca-bundle.crt` atau membutuhkan download file sertifikat CA khusus MySQL DB System dari metadata tenancy OCI.
   - *Langkah Verifikasi:* Diuji saat penyiapan koneksi database di Fase 2.
10. **Label SELinux `bin_t` & Verifikasi AVC Denial:**
    - *Isu:* Memastikan penetapan label konteks `bin_t` pada direktori virtual environment `/opt/personal-finance-agent/venv/bin` tidak memicu penolakan eksekusi oleh SELinux pada Oracle Linux 10.
    - *Langkah Verifikasi:* Menguji aktivasi service systemd Uvicorn pada Fase 0 dan memeriksa audit log SELinux dengan `sudo ausearch -m avc -ts recent`.

---

## 5. Bukti Kelengkapan (Output Eksekusi Skrip Validasi Mandiri)

Berikut adalah output hasil eksekusi skrip pemeriksaan kelengkapan otomatis terhadap file [master_architecture_and_execution_plan_v2.3.md](file:///C:/Project/Finance%20AI%20Agent/master_architecture_and_execution_plan_v2.3.md):

```text
TOTAL LINES: 1251

--- HEADERS ---
5: ## Riwayat Revisi Dokumen
14: ## 1. Ringkasan Eksekutif & Tujuan Sistem
18: ### 1.1. Fitur Utama:
33: ### 1.2. Panduan Konseptual: Mengapa dan Bagaimana Setiap Komponen Bekerja (*Why & How*)
74: ## 2. Status Faktual Infrastruktur & IAM Policy
76: ### A. Matriks Status Verifikasi Komponen
91: ### B. Spesifikasi IAM Policy (Dynamic Group: `pf-agent-app`)
122: ### C. Diagram Arsitektur Jaringan & Komponen
160: ## 3. Alur Data, OCI Speech Asinkron, & Model Netting Reversal
162: ### 3.1. Alur Input Suara Dua Tahap Asinkron (Speech Pipeline)
243: ### 3.2. Desain Jurnal Pembalik (*Reversal Transaction*) & Biaya Admin [DEFAULT]
292: ## 4. DDL Lengkap (MySQL 8.0/HeatWave Compatible) & Script Hak Akses
294: ### 4.1. File DDL Utama: `sql/01_schema_v2.sql`
560: ### 4.2. File Trigger Integritas: `sql/02_triggers.sql`
642: ### 4.3. Hak Akses User Runtime: `sql/03_runtime_grants.sql`
737: ### 4.4. Inisialisasi Data Awal & Provisioning Pengguna: `scripts/create_user.py` & `sql/04_seed.sql`
783: ### 4.5. Validasi DDL Lokal (Instruksi Pengujian Docker MySQL 8)
821: ## 5. Roadmap Eksekusi & Implementasi Teknis (Fase 0 - 7)
836: ### 5.0. Fase 0: Smoke Test OCI & Verifikasi Empiris (`scripts/smoke_test_oci.py`)
860: ### 5.1. Fase 1: Database Provisioning & Security Hardening
873: ### 5.2. Fase 2: Application Core Setup & Akses Lingkungan
910: ### 5.3. Fase 3: Service Layer & AI Engine
979: ### 5.4. Fase 4: Frontend SPA Mandiri
998: ### 5.5. Fase 5: Load Balancer, OS & Production Deployment
1087: ### 5.6. Fase 6: Pengujian E2E & Validasi Keamanan (10 Skenario Uji)
1134: ### 5.7. Fase 7: Modul Perencanaan Finansial (Fitur Lanjutan / Post-MVP) [DEFAULT]
1151: ## 6. Struktur Direktori Proyek Terpadu (Lokasi Produksi: `/opt/personal-finance-agent`)
1226: ## 7. Rangkuman Keputusan Desain & Item Verifikasi Empiris
1228: ### A. Rangkuman Keputusan Desain [DEFAULT]
1239: ### B. Rangkuman Item Verifikasi Empiris [PERLU VERIFIKASI] (Fase 0)

--- KEYWORD COUNTS ---
GRANT : 18
TRIGGER : 20
Fase 0 : 12
Fase 1 : 4
Fase 2 : 2
Fase 3 : 2
Fase 4 : 2
Fase 5 : 2
Fase 6 : 2
Fase 7 : 18
systemd : 7
proxy-headers : 2
forwarded-allow-ips : 4
firewalld : 2
SELinux : 7
Bastion : 4
Pydantic : 4
FOR UPDATE : 5
UTC : 6
04_seed : 7
IDOR : 8
Biaya Admin : 12
smoke_test : 3
REQUIRE SSL : 5

telegram count: 0
```

