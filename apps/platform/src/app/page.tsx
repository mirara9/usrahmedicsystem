"use client";

import Link from "next/link";
import { branches } from "@usrahmedic/domain";
import { BranchBadge, PublicTopbar } from "../components/chrome";
import { useLanguage } from "../components/language";

const heroImage = "https://usrahmedic.com/wp-content/uploads/2026/04/5.5-WEBSITE-1-scaled.webp";

const promotions = [
  {
    title: "Saringan Kesihatan Bakal Haji RM50*",
    detail: "Sesuai untuk semakan awal sebelum perjalanan dengan doktor keluarga Usrah Medic."
  },
  {
    title: "Pakej Implanon Ansuran",
    detail: "Pilihan rawatan wanita dengan penerangan ringkas dan aturan susulan yang jelas."
  },
  {
    title: "Kempen Vaksin Haji & Umrah",
    detail: "Semak ketersediaan vaksin dan dapatkan nasihat dokumen perjalanan daripada cawangan terdekat."
  }
] as const;

const services = [
  {
    title: "Ultrasound 2D / 3D / 4D / 5D",
    href: "/patient",
    image: "https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2023/08/ultrasound-2.jpg.webp",
    detail: "Untuk ibu mengandung, pemeriksaan susulan, dan temu janji scan mengikut cawangan."
  },
  {
    title: "Rawatan GP seisi keluarga",
    href: "/patient",
    image: "https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2023/09/11.jpg.webp",
    detail: "Demam, batuk, sakit tekak, follow-up penyakit biasa, dan rawatan walk-in."
  },
  {
    title: "Pakej saringan kesihatan",
    href: "/patient",
    image: "https://usrahmedic.com/wp-content/uploads/2026/04/gambar-saringan.webp",
    detail: "Pemeriksaan umum, darah, tekanan darah, dan semakan awal risiko kesihatan."
  },
  {
    title: "Paediatric follow-up",
    href: "/patient",
    image: "https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2025/05/kids-play2.jpg.webp",
    detail: "Rawatan dan susulan untuk bayi dan kanak-kanak dengan suasana lebih mesra keluarga."
  }
] as const;

const reasons = [
  "3 cawangan dengan waktu operasi yang jelas untuk pesakit.",
  "Mudah hubungi klinik melalui telefon atau WhatsApp untuk pengesahan slot.",
  "Perkhidmatan ibu, bayi, keluarga, ultrasound, dan saringan dalam satu jenama yang sama.",
  "Sesuai untuk walk-in, temu janji awal, dan susulan rawatan."
] as const;

export default function PublicSitePage() {
  useLanguage();

  return (
    <div className="app-shell public-site-modern">
      <PublicTopbar active="home" />
      <main className="page public-page">
        <section className="marketing-hero" id="top">
          <div className="marketing-hero-copy">
            <span className="eyebrow">Usrah Medic 24 Jam</span>
            <h1>Klinik keluarga untuk ibu, bayi, kanak-kanak, dan seisi keluarga.</h1>
            <p>
              Usrah Medic membantu pesakit mendapatkan rawatan umum, ultrasound, antenatal follow-up, saringan kesihatan,
              dan khidmat keluarga dengan cara yang lebih jelas dan lebih mudah dihubungi.
            </p>
            <div className="hero-actions">
              <Link className="primary-action" href="/patient">
                Tempah janji temu
              </Link>
              <a className="secondary-action" href="https://wa.me/601135664998" rel="noreferrer" target="_blank">
                WhatsApp kami
              </a>
            </div>
            <div className="hero-mini-cards">
              <article className="mini-card">
                <strong>{branches.length} cawangan</strong>
                <span>Pilih lokasi yang paling dekat dengan anda.</span>
              </article>
              <article className="mini-card">
                <strong>24 jam terpilih</strong>
                <span>Puncak Alam dan Seremban 2 beroperasi 24 jam.</span>
              </article>
              <article className="mini-card">
                <strong>Walk-in atau request slot</strong>
                <span>Klinik akan hubungi untuk sahkan masa lawatan anda.</span>
              </article>
            </div>
          </div>
          <div className="marketing-hero-media">
            <img alt="Promosi semasa Usrah Medic" src={heroImage} />
          </div>
        </section>

        <section className="section promo-strip" id="promosi">
          <div className="section-heading left-aligned">
            <div>
              <h2>Promosi semasa</h2>
              <p>Semakan pantas untuk pakej dan kempen yang sering ditanya pesakit.</p>
            </div>
          </div>
          <div className="promo-grid">
            {promotions.map((promotion) => (
              <article className="promo-card" key={promotion.title}>
                <span className="promo-pill">Promosi</span>
                <h3>{promotion.title}</h3>
                <p>{promotion.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="tentang">
          <div className="section-heading left-aligned">
            <div>
              <h2>Tentang Usrah Medic</h2>
              <p>
                Fokus utama kami ialah rawatan yang cepat dihubungi, maklumat cawangan yang jelas, dan pengalaman pesakit
                yang lebih kemas dari pertanyaan awal hingga lawatan ke klinik.
              </p>
            </div>
          </div>
          <div className="reasons-layout">
            <div className="reasons-grid">
              {reasons.map((reason) => (
                <article className="reason-card" key={reason}>
                  <span className="reason-dot" />
                  <p>{reason}</p>
                </article>
              ))}
            </div>
            <div className="doctor-visual-card">
              <img
                alt="Doktor dan staf Usrah Medic"
                src="https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2026/04/Untitled-design.png.webp"
              />
              <div>
                <h3>Mesra keluarga dan mudah dihubungi</h3>
                <p>
                  Sesuai untuk ibu mengandung, bayi, kanak-kanak, pesakit susulan, dan rawatan keluarga harian.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="perkhidmatan">
          <div className="section-heading left-aligned">
            <div>
              <h2>Perkhidmatan utama</h2>
              <p>Servis yang paling kerap dicari pesakit di Usrah Medic.</p>
            </div>
            <Link className="secondary-action" href="/patient">
              Hantar permintaan temu janji
            </Link>
          </div>
          <div className="service-grid-modern">
            {services.map((service) => (
              <article className="service-card-modern" key={service.title}>
                <img alt={service.title} src={service.image} />
                <div className="service-card-body">
                  <span className="service-chip">Perkhidmatan</span>
                  <h3>{service.title}</h3>
                  <p>{service.detail}</p>
                  <Link className="service-link" href={service.href}>
                    Minta slot
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section branches-section" id="rangkaian">
          <div className="section-heading left-aligned">
            <div>
              <h2>Cawangan kami</h2>
              <p>Pilih cawangan, semak waktu operasi, dan hubungi hotline terus.</p>
            </div>
          </div>
          <div className="grid grid-3 branch-grid-modern">
            {branches.map((branch) => (
              <article className="card branch-card-modern" key={branch.id}>
                <BranchBadge label={branch.area} />
                <h3>{branch.name}</h3>
                <p>{branch.hours}</p>
                <p>{branch.services.slice(0, 4).join(" • ")}</p>
                <a className="service-link" href={`tel:${branch.hotline.replace(/[^+\d]/g, "")}`}>
                  Hubungi {branch.hotline}
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="section panel-showcase" id="panel">
          <div className="section-heading left-aligned">
            <div>
              <h2>Panel klinik berdaftar</h2>
              <p>Maklumat panel dipaparkan dengan ringkas supaya pesakit dan syarikat mudah membuat semakan awal.</p>
            </div>
          </div>
          <div className="panel-visual-card">
            <img alt="Panel klinik berdaftar" src="https://usrahmedic.com/wp-content/uploads/2023/09/Panel-slider-1.png" />
          </div>
        </section>

        <section className="section system-route-showcase" id="hubungi">
          <div className="section-heading left-aligned">
            <div>
              <h2>Hubungi Usrah Medic</h2>
              <p>
                Jika anda belum pasti slot yang sesuai, hantar permintaan dahulu atau hubungi cawangan melalui telefon dan
                WhatsApp untuk pengesahan.
              </p>
            </div>
          </div>
          <div className="route-grid">
            <article className="route-card">
              <span className="route-chip">Temu janji</span>
              <h3>Hantar permintaan slot</h3>
              <p>Pilih cawangan, servis, dan masa pilihan. Klinik akan hubungi untuk pengesahan akhir.</p>
              <Link className="service-link" href="/patient">Buka borang temu janji</Link>
            </article>
            <article className="route-card">
              <span className="route-chip">WhatsApp</span>
              <h3>Balas lebih cepat untuk pertanyaan ringkas</h3>
              <p>Sesuaai untuk semakan awal tentang servis, waktu operasi, atau pertanyaan lokasi cawangan.</p>
              <a className="service-link" href="https://wa.me/601135664998" rel="noreferrer" target="_blank">WhatsApp sekarang</a>
            </article>
            <article className="route-card">
              <span className="route-chip">Telefon</span>
              <h3>Call cawangan terus</h3>
              <p>Untuk pesakit yang perlukan pengesahan segera tentang waktu lawatan atau ketersediaan perkhidmatan.</p>
              <a className="service-link" href="tel:+601135664998">011-3566 4998</a>
            </article>
          </div>
        </section>
      </main>

      <footer className="modern-footer">
        <div className="modern-footer-grid">
          <div>
            <h3>Usrah Medic</h3>
            <p>Klinik keluarga untuk rawatan umum, antenatal, ultrasound, saringan kesihatan, dan penjagaan seisi keluarga.</p>
          </div>
          <div>
            <h3>Pautan pantas</h3>
            <ul>
              <li><Link href="#promosi">Promosi</Link></li>
              <li><Link href="#perkhidmatan">Perkhidmatan</Link></li>
              <li><Link href="#rangkaian">Cawangan</Link></li>
              <li><Link href="/patient">Temu janji</Link></li>
            </ul>
          </div>
          <div>
            <h3>Hubungi</h3>
            <p>011-3566 4998</p>
            <p>admin@usrahmedic.com</p>
            <p>No.28 & 28A, Jalan Niaga Bestari 8, Bandar Puncak Alam, Kuala Selangor.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Dasar Privasi</span>
          <span>Copyright © Usrah Medic</span>
        </div>
      </footer>

      <a className="floating-whatsapp" href="https://wa.me/601135664998" target="_blank" rel="noreferrer">
        WhatsApp Kami
      </a>
    </div>
  );
}
