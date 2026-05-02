"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Globe2, Phone } from "lucide-react";

export type LanguageCode = "en" | "ms" | "zh" | "ta";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
}

interface PublicNavProps {
  active: "home" | "booking";
}

const languageStorageKey = "usrahmedic-language";

const languageOptions: Array<{ code: LanguageCode; label: string; nativeLabel: string; htmlLang: string }> = [
  { code: "en", label: "English", nativeLabel: "English", htmlLang: "en" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu", htmlLang: "ms" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", htmlLang: "zh-Hans" },
  { code: "ta", label: "Indian", nativeLabel: "தமிழ்", htmlLang: "ta" }
];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("ms");

  useEffect(() => {
    const urlLanguage = new URLSearchParams(window.location.search).get("lang");
    if (isLanguageCode(urlLanguage)) {
      setLanguageState(urlLanguage);
      return;
    }

    const savedLanguage = window.localStorage.getItem(languageStorageKey);
    if (isLanguageCode(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    const option = languageOptions.find((item) => item.code === language);
    document.documentElement.lang = option?.htmlLang ?? language;
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const copy = sharedCopy[language];

  return (
    <label className="language-picker">
      <Globe2 size={16} aria-hidden="true" />
      <span className="sr-only">{copy.languageLabel}</span>
      <select
        aria-label={copy.languageLabel}
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label} / {option.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LocalizedPublicNav({ active }: PublicNavProps) {
  const { language } = useLanguage();
  const copy = sharedCopy[language];

  const menuLinks = [
    { href: "/", label: copy.home, isActive: active === "home" },
    { href: "/#promosi", label: copy.promotions },
    { href: "/#tentang", label: copy.about },
    { href: "/#perkhidmatan", label: copy.services },
    { href: "/#rangkaian", label: copy.branches },
    { href: "/#hubungi", label: copy.contact }
  ];

  return (
    <nav className="surface-nav public-nav-modern" aria-label={copy.navAria}>
      {menuLinks.map((item) => (
        <Link className={item.isActive ? "active" : ""} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
      <Link className={active === "booking" ? "active" : ""} href="/patient">
        <CalendarCheck size={16} aria-hidden="true" />
        {copy.bookAppointment}
      </Link>
      <LanguageSelector />
      <a className="nav-contact" href="tel:+601135664998">
        <Phone size={16} aria-hidden="true" />
        011-3566 4998
      </a>
    </nav>
  );
}

export function usePublicHomeCopy() {
  return publicHomeCopy[useLanguage().language];
}

export function usePatientPageCopy() {
  return patientPageCopy[useLanguage().language];
}

export function usePatientBookingCopy() {
  return patientBookingCopy[useLanguage().language];
}

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "en" || value === "ms" || value === "zh" || value === "ta";
}

const sharedCopy = {
  en: {
    navAria: "Public navigation",
    home: "Home",
    promotions: "Promotions",
    about: "About",
    services: "Services",
    branches: "Branches",
    contact: "Contact",
    bookAppointment: "Book appointment",
    languageLabel: "Select language"
  },
  ms: {
    navAria: "Navigasi awam",
    home: "Laman utama",
    promotions: "Promosi",
    about: "Tentang",
    services: "Perkhidmatan",
    branches: "Cawangan",
    contact: "Hubungi",
    bookAppointment: "Tempah janji temu",
    languageLabel: "Pilih bahasa"
  },
  zh: {
    navAria: "公共导航",
    home: "主页",
    promotions: "促销",
    about: "关于我们",
    services: "服务",
    branches: "分院",
    contact: "联系",
    bookAppointment: "预约",
    languageLabel: "选择语言"
  },
  ta: {
    navAria: "பொது வழிசெலுத்தல்",
    home: "முகப்பு",
    promotions: "சலுகைகள்",
    about: "எங்களை பற்றி",
    services: "சேவைகள்",
    branches: "கிளைகள்",
    contact: "தொடர்பு",
    bookAppointment: "நேரம் பதிவு",
    languageLabel: "மொழியைத் தேர்வு செய்க"
  }
} as const;

const publicHomeCopy = {
  en: {
    notice: "Foundation preview",
    heroTitle: "UsrahMedic family clinic platform",
    heroText:
      "A fast public website and connected clinic system for branch discovery, booking, antenatal care, ultrasound, panels, chronic follow-up, and patient communication.",
    bookVisit: "Book visit",
    branchesTitle: "Branches",
    branchesText: "Official branch data becomes structured content shared across public, admin, mobile, and insight surfaces.",
    journeysTitle: "Patient journeys",
    journeysText: "The public site stays patient-friendly while feeding clean service, campaign, and booking data into operations.",
    branchAvailability: "Branch availability",
    whatsappFallback: "WhatsApp fallback",
    separateTitle: "Separate patient and clinic systems",
    separateText: "Patients use the public site and patient app. Staff, clinic operations, medicine, and owner insight remain separate authenticated workspaces."
  },
  ms: {
    notice: "Pratonton asas",
    heroTitle: "Platform klinik keluarga UsrahMedic",
    heroText:
      "Laman awam yang pantas dan sistem klinik bersambung untuk carian cawangan, tempahan, antenatal, ultrasound, panel, susulan kronik, dan komunikasi pesakit.",
    bookVisit: "Tempah lawatan",
    branchesTitle: "Cawangan",
    branchesText: "Data cawangan rasmi menjadi kandungan berstruktur yang dikongsi merentas laman awam, admin, mudah alih, dan insight.",
    journeysTitle: "Perjalanan pesakit",
    journeysText: "Laman awam kekal mesra pesakit sambil menghantar data servis, kempen, dan tempahan yang bersih kepada operasi.",
    branchAvailability: "Ketersediaan cawangan",
    whatsappFallback: "Sokongan WhatsApp",
    separateTitle: "Sistem pesakit dan klinik yang berasingan",
    separateText: "Pesakit menggunakan laman awam dan aplikasi pesakit. Staf, operasi klinik, ubat, dan insight pemilik kekal sebagai ruang kerja berautentikasi yang berasingan."
  },
  zh: {
    notice: "基础预览",
    heroTitle: "UsrahMedic 家庭诊所平台",
    heroText:
      "快速的公共网站和互联诊所系统，支持分院查询、预约、产前护理、超声波、Panel、慢病复诊和患者通知。",
    bookVisit: "预约就诊",
    branchesTitle: "分院",
    branchesText: "正式分院资料会成为结构化内容，并在公共网站、后台、移动端和业主报表中共享。",
    journeysTitle: "患者流程",
    journeysText: "公共网站保持易用，同时把服务、活动和预约数据干净地交给诊所运营。",
    branchAvailability: "分院服务",
    whatsappFallback: "WhatsApp 支援",
    separateTitle: "患者系统与诊所系统分开",
    separateText: "患者使用公共网站和患者应用。员工、诊所运营、药房和业主报表保留在独立的认证工作区。"
  },
  ta: {
    notice: "அடிப்படை முன்னோட்டம்",
    heroTitle: "UsrahMedic குடும்ப கிளினிக் தளம்",
    heroText:
      "கிளை தேடல், முன்பதிவு, கர்ப்ப பராமரிப்பு, அல்ட்ராசவுண்ட், Panel, நீண்டநாள் நோய் பின்தொடர்வு, மற்றும் நோயாளர் தொடர்புக்கு வேகமான பொதுத் தளம் மற்றும் இணைந்த கிளினிக் அமைப்பு.",
    bookVisit: "வருகை பதிவு",
    branchesTitle: "கிளைகள்",
    branchesText: "அதிகாரப்பூர்வ கிளை தகவல் பொதுத் தளம், நிர்வாகம், மொபைல், மற்றும் insight பகுதிகளுக்கு பகிரப்படும் கட்டமைக்கப்பட்ட உள்ளடக்கமாக இருக்கும்.",
    journeysTitle: "நோயாளர் பயணம்",
    journeysText: "பொதுத் தளம் நோயாளருக்கு எளிதாக இருந்து, சேவை, பிரச்சாரம், மற்றும் முன்பதிவு தரவை செயல்பாடுகளுக்கு அனுப்பும்.",
    branchAvailability: "கிளை கிடைக்கும் நிலை",
    whatsappFallback: "WhatsApp ஆதரவு",
    separateTitle: "நோயாளர் மற்றும் கிளினிக் அமைப்புகள் தனித்தனி",
    separateText: "நோயாளர்கள் பொதுத் தளம் மற்றும் நோயாளர் செயலியைப் பயன்படுத்துவர். பணியாளர், கிளினிக் செயல்பாடு, மருந்தகம், மற்றும் உரிமையாளர் insight தனி அங்கீகரிக்கப்பட்ட பணிப்பகுதிகளாக இருக்கும்."
  }
} as const;

const patientPageCopy = {
  en: {
    badge: "Usrah Medic appointment request",
    heroTitle: "Request an appointment and let the clinic confirm the best slot for you.",
    heroText:
      "Choose your branch, service, and preferred time. The clinic will review your request and contact you by phone or WhatsApp to confirm the final appointment.",
    open24: "24-hour branch",
    requestOnly: "Clinic confirmation first",
    branchCount: "branches",
    heroPhotoLabel: "Usrah Medic family clinic booking",
    processAria: "Booking process",
    processBadge: "How it works",
    processTitle: "Simple request, human confirmation",
    processText: "This form sends your preferred slot to the clinic. Payment is not collected on this page.",
    servicesBadge: "Popular services",
    servicesTitle: "Frequently requested services",
    servicesText: "Focused on what patients usually ask first: mother and child care, ultrasound, screening, vaccination, and family treatment.",
    branchAria: "UsrahMedic branches",
    services: [
      {
        title: "Antenatal & Buku Pink",
        detail: "Pregnancy check-ups, scheduled follow-up, urine/blood checks, and care advice."
      },
      {
        title: "2D to 5D Ultrasound",
        detail: "Scan bookings, reports, and slot confirmation by doctor and branch."
      },
      {
        title: "Hajj & Umrah",
        detail: "Health screening, vaccination, and documentation prepared for travel."
      }
    ],
    bookingSteps: [
      "Choose branch and service",
      "Share patient details",
      "Send request",
      "Wait for clinic confirmation"
    ]
  },
  ms: {
    badge: "Permintaan janji temu Usrah Medic",
    heroTitle: "Hantar permintaan janji temu dan biar klinik sahkan slot terbaik untuk anda.",
    heroText:
      "Pilih cawangan, servis, dan masa pilihan. Klinik akan semak permintaan anda dan hubungi melalui telefon atau WhatsApp untuk pengesahan akhir.",
    open24: "Cawangan 24 jam",
    requestOnly: "Sahkan dengan klinik dahulu",
    branchCount: "cawangan",
    heroPhotoLabel: "Tempahan klinik keluarga Usrah Medic",
    processAria: "Proses tempahan",
    processBadge: "Cara ia berfungsi",
    processTitle: "Permintaan ringkas, pengesahan oleh klinik",
    processText: "Borang ini menghantar slot pilihan anda kepada klinik. Tiada bayaran diambil di halaman ini.",
    servicesBadge: "Perkhidmatan popular",
    servicesTitle: "Perkhidmatan yang kerap diminta",
    servicesText: "Fokus kepada servis yang pesakit biasanya tanya dahulu: ibu dan anak, ultrasound, saringan, vaksinasi, dan rawatan keluarga.",
    branchAria: "Cawangan UsrahMedic",
    services: [
      {
        title: "Antenatal & Buku Pink",
        detail: "Pemeriksaan ibu mengandung, follow-up berkala, urine/blood check, dan nasihat penjagaan."
      },
      {
        title: "2D hingga 5D Ultrasound",
        detail: "Tempahan scan, laporan, dan pengesahan slot mengikut doktor serta cawangan."
      },
      {
        title: "Haji & Umrah",
        detail: "Saringan kesihatan, vaksinasi, dan dokumentasi yang disusun untuk perjalanan."
      }
    ],
    bookingSteps: [
      "Pilih cawangan dan perkhidmatan",
      "Isi butiran pesakit",
      "Hantar permintaan",
      "Tunggu pengesahan klinik"
    ]
  },
  zh: {
    badge: "Usrah Medic 预约请求",
    heroTitle: "提交预约请求，由诊所为您确认最合适的时段。",
    heroText:
      "选择分院、服务和首选时间后，诊所会通过电话或 WhatsApp 与您联系确认最终预约。",
    open24: "24 小时分院",
    requestOnly: "先由诊所确认",
    branchCount: "间分院",
    heroPhotoLabel: "Usrah Medic 家庭诊所预约",
    processAria: "预约流程",
    processBadge: "运作方式",
    processTitle: "先提交请求，再由诊所人工确认",
    processText: "此页面不会收取付款，只会把您的首选时段发送给诊所。",
    servicesBadge: "热门服务",
    servicesTitle: "常被咨询的服务",
    servicesText: "聚焦患者最常先询问的项目：母婴护理、超声波、筛查、疫苗和家庭医疗。",
    branchAria: "UsrahMedic 分院",
    services: [
      {
        title: "产前护理与 Buku Pink",
        detail: "孕期检查、定期复诊、尿液/血液检查和护理建议。"
      },
      {
        title: "2D 至 5D 超声波",
        detail: "扫描预约、报告，并按医生和分院确认时段。"
      },
      {
        title: "朝觐与副朝",
        detail: "健康筛查、疫苗接种和旅行所需文件安排。"
      }
    ],
    bookingSteps: [
      "选择分院和服务",
      "填写患者资料",
      "提交请求",
      "等待诊所确认"
    ]
  },
  ta: {
    badge: "Usrah Medic நேர கோரிக்கை",
    heroTitle: "நேர கோரிக்கையை அனுப்புங்கள்; சிறந்த நேரத்தை கிளினிக் உறுதி செய்யும்.",
    heroText:
      "கிளை, சேவை, மற்றும் விருப்ப நேரத்தைத் தேர்வு செய்யுங்கள். இறுதி நேரத்தை உறுதி செய்ய கிளினிக் தொலைபேசி அல்லது WhatsApp மூலம் தொடர்பு கொள்ளும்.",
    open24: "24 மணி கிளை",
    requestOnly: "முதலில் கிளினிக் உறுதி செய்யும்",
    branchCount: "கிளைகள்",
    heroPhotoLabel: "Usrah Medic குடும்ப கிளினிக் முன்பதிவு",
    processAria: "முன்பதிவு நடைமுறை",
    processBadge: "இது எப்படி செயல்படுகிறது",
    processTitle: "சுருக்கமான கோரிக்கை, மனித உறுதிப்படுத்தல்",
    processText: "இந்தப் பக்கம் கட்டணம் எடுக்காது; உங்கள் விருப்ப நேரம் கிளினிக்கிற்கு அனுப்பப்படும்.",
    servicesBadge: "பிரபல சேவைகள்",
    servicesTitle: "அதிகம் கேட்கப்படும் சேவைகள்",
    servicesText: "தாய்-குழந்தை பராமரிப்பு, அல்ட்ராசவுண்ட், screening, தடுப்பூசி, குடும்ப சிகிச்சை போன்றவற்றில் கவனம்.",
    branchAria: "UsrahMedic கிளைகள்",
    services: [
      {
        title: "கர்ப்ப பராமரிப்பு & Buku Pink",
        detail: "கர்ப்ப பரிசோதனை, தொடர்ச்சியான follow-up, urine/blood check, மற்றும் பராமரிப்பு ஆலோசனை."
      },
      {
        title: "2D முதல் 5D அல்ட்ராசவுண்ட்",
        detail: "Scan முன்பதிவு, அறிக்கை, மற்றும் மருத்துவர்/கிளை அடிப்படையில் நேர உறுதி."
      },
      {
        title: "ஹஜ் & உம்ரா",
        detail: "ஆரோக்கிய screening, தடுப்பூசி, மற்றும் பயணத்திற்கான ஆவணங்கள்."
      }
    ],
    bookingSteps: [
      "கிளை மற்றும் சேவையைத் தேர்வு செய்க",
      "நோயாளர் விவரங்களை நிரப்புக",
      "கோரிக்கையை அனுப்பு",
      "கிளினிக் உறுதிப்படுத்தலை காத்திரு"
    ]
  }
} as const;

const patientBookingCopy = {
  en: {
    loading: {
      title: "Sending appointment request",
      detail: "We are saving your details and preferred slot for clinic review."
    },
    initial: {
      title: "Choose a slot first",
      detail: "Start with the branch, service, date, and preferred time."
    },
    fallbackOffline: "Connection is unstable; the clinic needs to confirm this request manually.",
    fallbackEndpoint: "The clinic needs to confirm this request manually.",
    cardBadge: "Appointment request",
    cardTitle: "Request a clinic slot",
    cardText: "Keep it simple: choose a slot, enter patient details, then review and submit.",
    progress: ["Slot", "Patient", "Review"],
    incompleteTitle: "Appointment request incomplete",
    incompleteDetail: "Name, phone, visit date, time, and PDPA consent are required before the request can be sent.",
    acceptedTitle: "Appointment request received",
    rejectedTitle: "Booking request was not accepted",
    successDetail: (service: string, branch: string, _method: string) => `${service} at ${branch} was sent to the clinic for confirmation. `,
    fallbackDetail: (service: string, branch: string, reason: string) => `${service} at ${branch} is ready for clinic follow-up and manual confirmation. ${reason}`,
    retrySuffix: "Please retry when the API is healthy.",
    patientSectionTitle: "Patient details",
    patientSectionText: "We only ask for the basics needed to identify the patient and follow up.",
    reviewTitle: "Review before you send",
    reviewText: "Check the selected slot and patient details. The clinic will confirm the final time by phone or WhatsApp.",
    nextButton: "Continue to patient details",
    backButton: "Back",
    reviewButton: "Review request",
    fields: {
      fullName: "Full name",
      phone: "Phone number",
      email: "Email",
      idLast4: "Last 4 digits of IC/passport",
      dob: "Date of birth",
      sex: "Sex",
      visitReason: "Visit reason"
    },
    sex: {
      female: "Female",
      male: "Male",
      unknown: "Prefer not to say"
    },
    slotTitle: "Preferred slot",
    slotText: "Choose your preferred branch, service, and time. The clinic may suggest a nearby alternative slot.",
    branch: "Branch",
    service: "Service",
    appointmentDate: "Appointment date",
    preferredTime: "Preferred time",
    visitPlaceholder: "Example: antenatal follow-up, scan, child fever, hajj/umrah screening",
    depositTitle: "What happens next",
    depositText: "No payment is collected on this page.",
    paymentAria: "What happens next",
    summaryAria: "Booking summary",
    depositLabel: "Next step",
    hotline: "Hotline",
    selectedSlot: "Preferred slot",
    consent: "I agree that Usrah Medic may use these details for appointment handling and patient notifications.",
    submit: "Send appointment request",
    defaultReason: "Antenatal follow-up and routine check.",
    services: ["Antenatal follow-up", "2D/3D/4D/5D Ultrasound", "GP consultation", "Hajj and Umrah screening", "Health screening", "Family and child treatment"],
    depositMethods: {
      fpx: "Clinic reviews your request",
      ewallet: "Staff confirms the final time by phone or WhatsApp",
      card: "Bring supporting documents if needed",
      counter: "Payment only happens at clinic when applicable"
    }
  },
  ms: {
    loading: {
      title: "Menghantar permintaan janji temu",
      detail: "Kami sedang menyimpan butiran anda dan slot pilihan untuk semakan klinik."
    },
    initial: {
      title: "Mulakan dengan pilih slot",
      detail: "Pilih cawangan, servis, tarikh, dan masa pilihan dahulu."
    },
    fallbackOffline: "Sambungan tidak stabil; klinik perlu mengesahkan permintaan ini secara manual.",
    fallbackEndpoint: "Klinik perlu mengesahkan permintaan ini secara manual.",
    cardBadge: "Permintaan janji temu",
    cardTitle: "Mohon slot dengan klinik",
    cardText: "Ringkaskan langkah: pilih slot, isi butiran pesakit, semak semula, dan hantar.",
    progress: ["Slot", "Pesakit", "Semak"],
    incompleteTitle: "Permintaan janji temu tidak lengkap",
    incompleteDetail: "Nama, telefon, tarikh, masa, dan persetujuan PDPA diperlukan sebelum permintaan dihantar.",
    acceptedTitle: "Permintaan janji temu diterima",
    rejectedTitle: "Permintaan tempahan tidak diterima",
    successDetail: (service: string, branch: string, _method: string) => `${service} di ${branch} telah dihantar kepada klinik untuk pengesahan. `,
    fallbackDetail: (service: string, branch: string, reason: string) => `${service} di ${branch} sedia untuk susulan dan pengesahan manual oleh klinik. ${reason}`,
    retrySuffix: "Sila cuba semula apabila API sihat.",
    patientSectionTitle: "Butiran pesakit",
    patientSectionText: "Kami hanya minta maklumat asas untuk kenal pasti pesakit dan buat susulan.",
    reviewTitle: "Semak sebelum hantar",
    reviewText: "Periksa slot pilihan dan butiran pesakit. Klinik akan sahkan masa akhir melalui telefon atau WhatsApp.",
    nextButton: "Teruskan ke butiran pesakit",
    backButton: "Kembali",
    reviewButton: "Semak permintaan",
    fields: {
      fullName: "Nama penuh",
      phone: "No. telefon",
      email: "Email",
      idLast4: "4 digit akhir IC/passport",
      dob: "Tarikh lahir",
      sex: "Jantina",
      visitReason: "Tujuan lawatan"
    },
    sex: {
      female: "Perempuan",
      male: "Lelaki",
      unknown: "Tidak dinyatakan"
    },
    slotTitle: "Slot pilihan",
    slotText: "Pilih cawangan, servis, dan masa pilihan. Klinik mungkin mencadangkan slot alternatif yang berdekatan.",
    branch: "Cawangan",
    service: "Perkhidmatan",
    appointmentDate: "Tarikh janji temu",
    preferredTime: "Masa pilihan",
    visitPlaceholder: "Contoh: Follow-up antenatal, scan, demam anak, saringan haji/umrah",
    depositTitle: "Apa berlaku seterusnya",
    depositText: "Tiada bayaran diambil di halaman ini.",
    paymentAria: "Apa berlaku seterusnya",
    summaryAria: "Ringkasan tempahan",
    depositLabel: "Langkah seterusnya",
    hotline: "Hotline",
    selectedSlot: "Slot pilihan",
    consent: "Saya bersetuju Usrah Medic menggunakan butiran ini untuk pengendalian janji temu dan notifikasi pesakit.",
    submit: "Hantar permintaan janji temu",
    defaultReason: "Antenatal follow-up and routine check.",
    services: ["Antenatal follow-up", "2D/3D/4D/5D Ultrasound", "GP consultation", "Haji and Umrah screening", "Saringan kesihatan", "Rawatan keluarga dan kanak-kanak"],
    depositMethods: {
      fpx: "Klinik menyemak permintaan anda",
      ewallet: "Staf menghubungi untuk sahkan masa akhir",
      card: "Bawa dokumen sokongan jika perlu",
      counter: "Bayaran hanya dibuat di klinik jika berkaitan"
    }
  },
  zh: {
    loading: {
      title: "正在提交预约请求",
      detail: "我们正在保存您的资料和首选时段供诊所审核。"
    },
    initial: {
      title: "先选择时段",
      detail: "先选择分院、服务、日期和首选时间。"
    },
    fallbackOffline: "网络不稳定；诊所需要手动确认此请求。",
    fallbackEndpoint: "诊所需要手动确认此请求。",
    cardBadge: "预约请求",
    cardTitle: "向诊所申请时段",
    cardText: "保持简单：先选时段，再填患者资料，最后确认并提交。",
    progress: ["时段", "患者", "确认"],
    incompleteTitle: "预约请求资料不完整",
    incompleteDetail: "提交前需要姓名、电话、日期、时间和 PDPA 同意。",
    acceptedTitle: "预约请求已收到",
    rejectedTitle: "预约请求未被接受",
    successDetail: (service: string, branch: string, _method: string) => `${branch} 的 ${service} 已发送给诊所确认。 `,
    fallbackDetail: (service: string, branch: string, reason: string) => `${branch} 的 ${service} 已准备好由诊所人工跟进确认。${reason}`,
    retrySuffix: "请在 API 恢复后重试。",
    patientSectionTitle: "患者资料",
    patientSectionText: "我们只收集诊所确认和联系患者所需的基本资料。",
    reviewTitle: "提交前再确认",
    reviewText: "请检查时段和患者资料。诊所会通过电话或 WhatsApp 与您确认最终时间。",
    nextButton: "继续填写患者资料",
    backButton: "返回",
    reviewButton: "查看请求",
    fields: {
      fullName: "全名",
      phone: "电话号码",
      email: "电邮",
      idLast4: "IC/护照最后 4 位",
      dob: "出生日期",
      sex: "性别",
      visitReason: "就诊原因"
    },
    sex: {
      female: "女",
      male: "男",
      unknown: "不说明"
    },
    slotTitle: "首选时段",
    slotText: "选择分院、服务和首选时间；如有需要，诊所可能建议相近时段。",
    branch: "分院",
    service: "服务",
    appointmentDate: "预约日期",
    preferredTime: "首选时间",
    visitPlaceholder: "例如：产前复诊、扫描、小孩发烧、朝觐/副朝筛查",
    depositTitle: "接下来会发生什么",
    depositText: "此页面不会收取任何付款。",
    paymentAria: "接下来会发生什么",
    summaryAria: "预约摘要",
    depositLabel: "下一步",
    hotline: "热线",
    selectedSlot: "首选时段",
    consent: "我同意 Usrah Medic 使用这些资料处理预约和患者通知。",
    submit: "提交预约请求",
    defaultReason: "产前复诊和常规检查。",
    services: ["产前复诊", "2D/3D/4D/5D 超声波", "普通门诊", "朝觐与副朝筛查", "健康筛查", "家庭和儿童治疗"],
    depositMethods: {
      fpx: "诊所会先审核您的请求",
      ewallet: "工作人员会通过电话或 WhatsApp 确认最终时间",
      card: "如有需要，请带上相关文件",
      counter: "如适用，费用只在诊所支付"
    }
  },
  ta: {
    loading: {
      title: "நேர கோரிக்கை அனுப்பப்படுகிறது",
      detail: "உங்கள் விவரங்களும் விருப்ப நேரமும் கிளினிக் பரிசீலனைக்காக சேமிக்கப்படுகின்றன."
    },
    initial: {
      title: "முதலில் நேரத்தைத் தேர்வு செய்க",
      detail: "கிளை, சேவை, தேதி, மற்றும் விருப்ப நேரத்தை முதலில் தேர்வு செய்யுங்கள்."
    },
    fallbackOffline: "இணைப்பு நிலையாக இல்லை; கிளினிக் இந்த கோரிக்கையை கைமுறையாக உறுதி செய்ய வேண்டும்.",
    fallbackEndpoint: "கிளினிக் இந்த கோரிக்கையை கைமுறையாக உறுதி செய்ய வேண்டும்.",
    cardBadge: "நேர கோரிக்கை",
    cardTitle: "கிளினிக்கிடம் நேரம் கோருங்கள்",
    cardText: "எளிமையாக வைத்திருக்கிறோம்: நேரத்தைத் தேர்வு செய்யுங்கள், நோயாளர் விவரங்களை நிரப்புங்கள், பிறகு சரிபார்த்து அனுப்புங்கள்.",
    progress: ["நேரம்", "நோயாளர்", "சரிபார்"],
    incompleteTitle: "நேர கோரிக்கை முழுமையில்லை",
    incompleteDetail: "அனுப்புவதற்கு முன் பெயர், தொலைபேசி, தேதி, நேரம், மற்றும் PDPA ஒப்புதல் தேவை.",
    acceptedTitle: "நேர கோரிக்கை பெறப்பட்டது",
    rejectedTitle: "முன்பதிவு கோரிக்கை ஏற்கப்படவில்லை",
    successDetail: (service: string, branch: string, _method: string) => `${branch} கிளையில் ${service} கிளினிக் உறுதிப்படுத்த அனுப்பப்பட்டது. `,
    fallbackDetail: (service: string, branch: string, reason: string) => `${branch} கிளையில் ${service} கைமுறை உறுதிப்படுத்தலுக்குத் தயாராக உள்ளது. ${reason}`,
    retrySuffix: "API சரியாக இயங்கும் போது மீண்டும் முயற்சிக்கவும்.",
    patientSectionTitle: "நோயாளர் விவரங்கள்",
    patientSectionText: "நோயாளரை அடையாளம் காணவும் தொடர்பு கொள்ளவும் தேவையான அடிப்படை தகவல்கள் மட்டுமே கேட்கப்படுகின்றன.",
    reviewTitle: "அனுப்பும் முன் சரிபார்க்கவும்",
    reviewText: "தேர்ந்தெடுத்த நேரத்தையும் நோயாளர் விவரங்களையும் சரிபார்க்கவும். இறுதி நேரத்தை கிளினிக் தொலைபேசி அல்லது WhatsApp மூலம் உறுதி செய்யும்.",
    nextButton: "நோயாளர் விவரங்களுக்கு தொடர்க",
    backButton: "திரும்பு",
    reviewButton: "கோரிக்கையைச் சரிபார்",
    fields: {
      fullName: "முழு பெயர்",
      phone: "தொலைபேசி எண்",
      email: "மின்னஞ்சல்",
      idLast4: "IC/passport கடைசி 4 இலக்கம்",
      dob: "பிறந்த தேதி",
      sex: "பாலினம்",
      visitReason: "வருகை காரணம்"
    },
    sex: {
      female: "பெண்",
      male: "ஆண்",
      unknown: "குறிப்பிட விருப்பமில்லை"
    },
    slotTitle: "விருப்ப நேரம்",
    slotText: "கிளை, சேவை, மற்றும் விருப்ப நேரத்தைத் தேர்வு செய்யுங்கள்; தேவைப்பட்டால் அருகிலான மாற்று நேரத்தை கிளினிக் பரிந்துரைக்கலாம்.",
    branch: "கிளை",
    service: "சேவை",
    appointmentDate: "நேர தேதி",
    preferredTime: "விருப்ப நேரம்",
    visitPlaceholder: "உதா: கர்ப்ப follow-up, scan, குழந்தை காய்ச்சல், ஹஜ்/உம்ரா screening",
    depositTitle: "அடுத்து என்ன நடக்கும்",
    depositText: "இந்தப் பக்கத்தில் எந்தக் கட்டணமும் பெறப்படாது.",
    paymentAria: "அடுத்து என்ன நடக்கும்",
    summaryAria: "முன்பதிவு சுருக்கம்",
    depositLabel: "அடுத்த படி",
    hotline: "Hotline",
    selectedSlot: "விருப்ப நேரம்",
    consent: "இந்த விவரங்களை முன்பதிவு மற்றும் நோயாளர் அறிவிப்புகளுக்காக Usrah Medic பயன்படுத்த நான் ஒப்புக்கொள்கிறேன்.",
    submit: "நேர கோரிக்கையை அனுப்பு",
    defaultReason: "கர்ப்ப follow-up மற்றும் வழக்கமான பரிசோதனை.",
    services: ["கர்ப்ப follow-up", "2D/3D/4D/5D அல்ட்ராசவுண்ட்", "GP consultation", "ஹஜ் மற்றும் உம்ரா screening", "ஆரோக்கிய screening", "குடும்பம் மற்றும் குழந்தை சிகிச்சை"],
    depositMethods: {
      fpx: "கிளினிக் உங்கள் கோரிக்கையைப் பரிசீலிக்கும்",
      ewallet: "இறுதி நேரத்தை பணியாளர் தொலைபேசி அல்லது WhatsApp மூலம் உறுதி செய்வார்",
      card: "தேவைப்பட்டால் ஆதார ஆவணங்களை கொண்டு வாருங்கள்",
      counter: "தேவைப்பட்டால் கட்டணம் கிளினிக்கில் மட்டுமே செலுத்தப்படும்"
    }
  }
} as const;
