"use client";

import Link from "next/link";
import { branches } from "@usrahmedic/domain";
import { BranchBadge, PublicTopbar } from "../components/chrome";
import { useLanguage } from "../components/language";

const heroSlides = [
  {
    title: "Kempen Sihat Raya 2026",
    subtitle: "Promosi kesihatan keluarga yang lebih jelas, lebih pantas, dan lebih moden.",
    image: "https://usrahmedic.com/wp-content/uploads/2026/04/5.5-WEBSITE-1-scaled.webp",
    ctaLabel: "Lihat Promosi",
    ctaHref: "#promosi"
  },
  {
    title: "Sedut Kahak (Suction)",
    subtitle: "Servis rawatan yang mudah ditemui dan mudah ditempah oleh pesakit.",
    image: "https://usrahmedic.com/wp-content/uploads/2026/01/Suction-Sedut-Kahak-Bayi-Desktop-Slider-WEBP-scaled.webp",
    ctaLabel: "Lihat Perkhidmatan",
    ctaHref: "#perkhidmatan"
  }
] as const;

const services = [
  {
    title: "Ultrasound scan 2D/3D/4D/5D",
    href: "#perkhidmatan",
    image: "https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2023/08/ultrasound-2.jpg.webp"
  },
  {
    title: "Sedut Kahak (Suction)",
    href: "#perkhidmatan",
    image: "https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2023/09/11.jpg.webp"
  },
  {
    title: "Pakej Saringan Kesihatan",
    href: "#perkhidmatan",
    image: "https://usrahmedic.com/wp-content/uploads/2026/04/gambar-saringan.webp"
  },
  {
    title: "Paediatric Follow Up",
    href: "#perkhidmatan",
    image: "https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2025/05/kids-play2.jpg.webp"
  }
] as const;

const reasons = [
  "Barisan doktor dan staf yang mesra, komited dan teliti dalam memberi rawatan terbaik.",
  "Waktu menunggu yang singkat dengan operasi yang lebih tersusun.",
  "Merupakan klinik 24 jam yang beroperasi setiap hari.",
  "Pelbagai jenis rawatan untuk semua peringkat umur.",
  "Khidmat pelanggan yang responsif melalui telefon dan media sosial.",
  "Sistem temujanji dan aliran pesakit yang lebih moden untuk demo baharu ini."
] as const;

const promotions = [
  "Kempen Sihat Raya 2026",
  "Saringan Kesihatan Bakal Haji RM50* Sahaja",
  "Pakej Implanon Ansuran",
  "Kempen Vaksin Haji & Umrah"
] as const;

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "TikTok", href: "https://www.tiktok.com/" }
] as const;

export default function PublicSitePage() {
  useLanguage();
  const hero = heroSlides[0];

  return (
    <div className="app-shell public-site-modern">
      <PublicTopbar active="home" />
      <main className="page public-page">
        <section className="marketing-hero" id="top">
          <div className="marketing-hero-copy">
            <span className="eyebrow">Usrah Medic 24 Jam</span>
            <h1>Laman utama moden untuk Usrah Medic, dibina semula dari asas jenama sedia ada.</h1>
            <p>
              Demo ini mengekalkan identiti semasa Usrah Medic — promosi, servis utama, panel, cawangan, dan hubungan mesra
              pesakit — tetapi dengan pengalaman yang lebih moden, pantas, dan sesuai untuk diperluaskan bersama sistem klinik.
            </p>
            <div className="hero-actions">
              <Link className="primary-action" href={hero.ctaHref}>
                {hero.ctaLabel}
              </Link>
              <Link className="secondary-action" href="/patient">
                Tempah Janji Temu
              </Link>
            </div>
            <div className="hero-mini-cards">
              <article className="mini-card">
                <strong>3 Cawangan</strong>
                <span>Struktur semasa, sedia untuk berkembang.</span>
              </article>
              <article className="mini-card">
                <strong>24 Jam</strong>
                <span>Maklumat utama yang jelas untuk pesakit.</span>
              </article>
              <article className="mini-card">
                <strong>Cloudflare Demo</strong>
                <span>Lebih pantas berbanding WordPress semasa.</span>
              </article>
            </div>
          </div>
          <div className="marketing-hero-media">
            <img alt="Promosi semasa Usrah Medic" src={hero.image} />
          </div>
        </section>

        <section className="section promo-strip" id="promosi">
          <div className="section-heading left-aligned">
            <div>
              <h2>Promosi Terkini</h2>
              <p>Konsep carousel dan kempen promosi dikekalkan, tetapi dipersembahkan semula dengan susun atur yang lebih moden.</p>
            </div>
          </div>
          <div className="promo-grid">
            {promotions.map((promotion) => (
              <article className="promo-card" key={promotion}>
                <span className="promo-pill">Promosi</span>
                <h3>{promotion}</h3>
                <p>Blok promosi ini boleh diurus sebagai kandungan berstruktur dan dikitar semula di homepage, landing page, dan kempen khas.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="perkhidmatan">
          <div className="section-heading left-aligned">
            <div>
              <h2>Apa Yang Kami Tawarkan</h2>
              <p>Servis utama daripada laman semasa dikekalkan sebagai kad visual yang lebih kemas dan lebih mudah diteroka.</p>
            </div>
            <Link className="secondary-action" href="#panel">
              Lihat Panel
            </Link>
          </div>
          <div className="service-grid-modern">
            {services.map((service) => (
              <article className="service-card-modern" key={service.title}>
                <img alt={service.title} src={service.image} />
                <div className="service-card-body">
                  <span className="service-chip">Perkhidmatan Popular</span>
                  <h3>{service.title}</h3>
                  <Link className="service-link" href={service.href}>
                    Lihat Butiran
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section reasons-section" id="tentang">
          <div className="section-heading left-aligned">
            <div>
              <h2>Mengapa Memilih Kami</h2>
              <p>Bahagian ini mengekalkan mesej utama laman semasa tetapi disusun semula dengan gaya yang lebih profesional dan mudah dibaca.</p>
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
            <div className="doctor-visual-card" id="doktor">
              <img
                alt="Doktor dan staf Usrah Medic"
                src="https://usrahmedic.com/wp-content/webp-express/webp-images/uploads/2026/04/Untitled-design.png.webp"
              />
              <div>
                <h3>Profil doktor dan staf dengan gaya baharu</h3>
                <p>Halaman profil doktor boleh dibina semula menggunakan tema yang sama supaya pengalaman awam dan sistem dalaman kekal konsisten.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section branches-section" id="rangkaian">
          <div className="section-heading left-aligned">
            <div>
              <h2>Rangkaian Kami</h2>
              <p>Maklumat cawangan dijadikan kandungan berstruktur supaya boleh dikongsi antara laman awam, tempahan, dan sistem operasi.</p>
            </div>
          </div>
          <div className="grid grid-3 branch-grid-modern">
            {branches.map((branch) => (
              <article className="card branch-card-modern" key={branch.id}>
                <BranchBadge label={branch.area} />
                <h3>{branch.name}</h3>
                <p>{branch.hours}</p>
                <p>{branch.hotline}</p>
                <div className="pill-row">
                  {branch.services.slice(0, 4).map((service) => (
                    <span className="pill" key={service}>
                      {service}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section panel-showcase" id="panel">
          <div className="section-heading left-aligned">
            <div>
              <h2>Panel Klinik Berdaftar</h2>
              <p>Logo panel sedia ada boleh dikekalkan dan dipersembahkan dalam seksyen yang lebih bersih untuk meningkatkan kepercayaan pesakit dan korporat.</p>
            </div>
          </div>
          <div className="panel-visual-card">
            <img alt="Panel klinik berdaftar" src="https://usrahmedic.com/wp-content/uploads/2023/09/Panel-slider-1.png" />
          </div>
        </section>

        <section className="section system-route-showcase" id="info-kesihatan">
          <div className="section-heading left-aligned">
            <div>
              <h2>Laman Awam + Sistem Klinik</h2>
              <p>Homepage ini akan menjadi sambungan tema yang sama untuk route awam dan route sistem, bukan dua produk yang nampak berbeza.</p>
            </div>
          </div>
          <div className="route-grid">
            <article className="route-card">
              <span className="route-chip">Awam</span>
              <h3>Promosi, servis, panel, cawangan</h3>
              <p>Laman utama, promosi, doctor profile, perkhidmatan, info kesihatan, dan halaman kerjaya boleh kekal di bawah tema ini.</p>
            </article>
            <article className="route-card">
              <span className="route-chip">Pesakit</span>
              <h3>/patient</h3>
              <p>Tempahan janji temu, semakan cawangan, notifikasi, dan pengalaman pesakit boleh dibina pada route khusus tetapi masih dalam identiti jenama yang sama.</p>
            </article>
            <article className="route-card">
              <span className="route-chip">Operasi</span>
              <h3>/admin · /medicine · /insight</h3>
              <p>Operasi dalaman, farmasi, billing, dan dashboard pemilik kekal berasingan tetapi tetap serasi secara visual dengan laman awam.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="modern-footer">
        <div className="modern-footer-grid">
          <div>
            <h3>Menu Utama</h3>
            <ul>
              <li><Link href="#top">Laman Utama</Link></li>
              <li><Link href="#promosi">Promosi</Link></li>
              <li><Link href="#tentang">Siapa Kami</Link></li>
              <li><Link href="#panel">Panel</Link></li>
              <li><Link href="#perkhidmatan">Perkhidmatan</Link></li>
              <li><Link href="#rangkaian">Rangkaian Kami</Link></li>
            </ul>
          </div>
          <div>
            <h3>Perkhidmatan</h3>
            <ul>
              {services.map((service) => (
                <li key={service.title}>
                  <Link href="#perkhidmatan">{service.title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Promosi Terkini</h3>
            <ul>
              {promotions.map((promotion) => (
                <li key={promotion}>{promotion}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Klinik Usrah Medic 24 Jam (HQ)</h3>
            <p>No.28 & 28A, Jalan Niaga Bestari 8, Persiaran Puncak Bestari 2, Bandar Puncak Alam, 42300 Kuala Selangor.</p>
            <p>011-3566 4998</p>
            <p>admin@usrahmedic.com</p>
          </div>
          <div id="sertai-kami">
            <h3>Media Sosial</h3>
            <ul>
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Dasar Privasi</span>
          <span>Copyright © Usrah Medic 2023 Dimiliki oleh Imtiyaz Assyifa Healthcare Sdn. Bhd. (1376669-D)</span>
        </div>
      </footer>

      <a className="floating-whatsapp" href="https://wa.me/601135664998" target="_blank" rel="noreferrer">
        WhatsApp Kami
      </a>
    </div>
  );
}
