/* Every editable table in the Pulse database, described once.
   app.js turns each entry into a searchable list + add/edit form automatically.

   Field types: text, textarea, number, select, fk (link to another table), bool,
   image (upload to storage), url, email, tel, date, slug (auto-built from another field), specs. */
(() => {
  const STATUS = { name: "status", label: "Status", type: "select", options: [["active", "Active"], ["inactive", "Inactive"]], default: "active" };
  const ORDER = { name: "display_order", label: "Display order", type: "number", default: 0, help: "Lower numbers show first." };
  const SEO = [
    { name: "seo_title", label: "SEO title", type: "text", max: 60, group: "SEO" },
    { name: "seo_description", label: "SEO description", type: "textarea", max: 160, rows: 3, group: "SEO" },
  ];

  window.RESOURCES = {
    products: {
      table: "products", title: "Products", one: "product", icon: "box",
      order: ["updated_at", false], search: ["name", "slug"],
      filters: [{ name: "status", options: [["active", "Active"], ["draft", "Draft"], ["inactive", "Inactive"]] }, { name: "category_id", fk: "categories" }],
      list: [
        { name: "featured_image", type: "image" },
        { name: "name", strong: true, sub: "slug" },
        { name: "category_id", fk: "categories" },
        { name: "status", type: "badge" },
        { name: "updated_at", type: "ago" },
      ],
      fields: [
        { name: "name", label: "Product name", type: "text", required: true },
        { name: "slug", label: "URL slug", type: "slug", from: "name", required: true, help: "Used in the web address, e.g. icu-ventilator." },
        { name: "category_id", label: "Category", type: "fk", table: "categories", required: true },
        { name: "product_type_id", label: "Product type", type: "fk", table: "product_types", filterBy: "category_id" },
        { name: "status", label: "Status", type: "select", options: [["active", "Active (on website)"], ["draft", "Draft"], ["inactive", "Inactive"]], default: "draft" },
        { name: "short_description", label: "Short description", type: "textarea", rows: 2, max: 200 },
        { name: "description", label: "Full description", type: "textarea", rows: 6 },
        { name: "featured_image", label: "Main image", type: "image" },
        { name: "brochure_url", label: "Brochure link (PDF URL)", type: "url" },
        { name: "warranty_years", label: "Warranty (years)", type: "number", min: 0, max: 20 },
        { name: "amc_available", label: "AMC available", type: "bool" },
        { name: "specifications", label: "Specifications", type: "specs", group: "Specifications" },
        ...SEO,
      ],
      extras: ["gallery", "applications", "certifications"],
    },
    categories: {
      table: "categories", title: "Categories", one: "category", icon: "grid",
      order: ["display_order", true], search: ["name", "slug"],
      list: [{ name: "thumbnail_image_url", type: "image" }, { name: "name", strong: true, sub: "slug" }, { name: "display_order" }, { name: "status", type: "badge" }],
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "URL slug", type: "slug", from: "name", required: true },
        { name: "description", label: "Description", type: "textarea", rows: 3 },
        { name: "thumbnail_image_url", label: "Thumbnail image", type: "image" },
        { name: "header_image_url", label: "Header (banner) image", type: "image" },
        ORDER, STATUS, ...SEO,
      ],
    },
    product_types: {
      table: "product_types", title: "Product Types", one: "product type", icon: "tag",
      order: ["display_order", true], search: ["name", "slug"],
      filters: [{ name: "category_id", fk: "categories" }],
      list: [{ name: "name", strong: true, sub: "slug" }, { name: "category_id", fk: "categories" }, { name: "display_order" }],
      fields: [
        { name: "category_id", label: "Category", type: "fk", table: "categories", required: true },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "URL slug", type: "slug", from: "name", required: true },
        ORDER,
      ],
    },
    applications: {
      table: "applications", title: "Applications", one: "application", icon: "layers",
      order: ["name", true], search: ["name"],
      list: [{ name: "name", strong: true, sub: "slug" }],
      fields: [{ name: "name", label: "Name", type: "text", required: true, help: "Where products are used, e.g. ICU, Operation Theatre." }, { name: "slug", label: "Slug", type: "slug", from: "name", required: true }],
    },
    certifications: {
      table: "certifications", title: "Product Certifications", one: "certification", icon: "award",
      order: ["name", true], search: ["name"],
      list: [{ name: "name", strong: true }, { name: "description" }],
      fields: [{ name: "name", label: "Name", type: "text", required: true, help: "e.g. ISO 13485, CE, CDSCO" }, { name: "description", label: "Description", type: "textarea", rows: 2 }],
    },
    distributors: {
      table: "distributors", title: "Distributors", one: "distributor", icon: "truck",
      order: ["created_at", false], search: ["company_name", "contact_person", "city", "state", "email", "phone"],
      filters: [{ name: "status", options: [["active", "Active"], ["inactive", "Inactive"]] }, { name: "country_id", fk: "countries" }],
      list: [{ name: "company_name", strong: true, sub: "contact_person" }, { name: "city", join: ["city", "state"] }, { name: "phone", type: "tel" }, { name: "category_id", fk: "categories" }, { name: "status", type: "badge" }],
      fields: [
        { name: "company_name", label: "Company name", type: "text", required: true },
        { name: "contact_person", label: "Contact person", type: "text" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "email", label: "Email", type: "email" },
        { name: "country_id", label: "Country", type: "fk", table: "countries" },
        { name: "state", label: "State", type: "text" },
        { name: "city", label: "City", type: "text" },
        { name: "address", label: "Address", type: "textarea", rows: 2 },
        { name: "category_id", label: "Category they sell", type: "fk", table: "categories" },
        STATUS,
      ],
    },
    countries: {
      table: "countries", title: "Countries", one: "country", icon: "globe",
      order: ["name", true], search: ["name", "code"],
      list: [{ name: "name", strong: true }, { name: "code" }],
      fields: [{ name: "name", label: "Country", type: "text", required: true }, { name: "code", label: "Code", type: "text", help: "Two letters, e.g. IN" }],
    },
    banners: {
      table: "banners", title: "Banners", one: "banner", icon: "image",
      order: ["display_order", true], search: ["title"],
      filters: [{ name: "status", options: [["active", "Active"], ["inactive", "Inactive"]] }],
      list: [{ name: "image_url", type: "image", wide: true }, { name: "title", strong: true, sub: "link_url" }, { name: "start_date", type: "range", to: "end_date" }, { name: "display_order" }, { name: "status", type: "badge" }],
      fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "image_url", label: "Desktop image", type: "image", required: true, help: "Wide image, about 1920 × 600 px." },
        { name: "mobile_image_url", label: "Mobile image", type: "image", help: "Taller image, about 800 × 1000 px." },
        { name: "link_url", label: "Link when clicked", type: "url" },
        { name: "category_id", label: "Show on category", type: "fk", table: "categories", help: "Leave empty for the home page." },
        { name: "start_date", label: "Start date", type: "date" },
        { name: "end_date", label: "End date", type: "date" },
        ORDER, STATUS,
      ],
    },
    faqs: {
      table: "faqs", title: "FAQs", one: "FAQ", icon: "help",
      order: ["display_order", true], search: ["question", "answer", "category"],
      filters: [{ name: "category", distinct: true }],
      list: [{ name: "question", strong: true, sub: "category" }, { name: "display_order" }, { name: "is_active", type: "bool", label: "Live" }],
      fields: [
        { name: "question", label: "Question", type: "text", required: true },
        { name: "answer", label: "Answer", type: "textarea", rows: 5, required: true },
        { name: "category", label: "Category", type: "text", suggest: true, help: "e.g. critical, renal, general" },
        ORDER,
        { name: "is_active", label: "Show on website", type: "bool", default: true },
      ],
    },
    site_stats: {
      table: "site_stats", title: "Site Stats", one: "stat", icon: "bar",
      order: ["display_order", true], search: ["label", "value"],
      list: [{ name: "value", strong: true }, { name: "label" }, { name: "display_order" }, { name: "updated_at", type: "ago" }],
      fields: [{ name: "value", label: "Number", type: "text", required: true, help: "e.g. 500+" }, { name: "label", label: "Label", type: "text", required: true, help: "e.g. Hospitals served" }, ORDER],
    },
    facility_gallery: {
      table: "facility_gallery", title: "Facility Gallery", one: "photo", icon: "camera",
      order: ["display_order", true], search: ["caption", "category"],
      filters: [{ name: "status", options: [["active", "Active"], ["inactive", "Inactive"]] }],
      list: [{ name: "image_url", type: "image" }, { name: "caption", strong: true, sub: "category" }, { name: "display_order" }, { name: "status", type: "badge" }],
      fields: [{ name: "image_url", label: "Photo", type: "image", required: true }, { name: "caption", label: "Caption", type: "text" }, { name: "category", label: "Category", type: "text", suggest: true }, ORDER, STATUS],
    },
    company_certifications: {
      table: "company_certifications", title: "Company Certificates", one: "certificate", icon: "award",
      order: ["name", true], search: ["name"],
      list: [{ name: "certificate_file_url", type: "image" }, { name: "name", strong: true, sub: "description" }, { name: "valid_until", type: "expiry" }],
      fields: [
        { name: "name", label: "Certificate", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", rows: 2 },
        { name: "certificate_file_url", label: "Certificate image", type: "image", help: "Upload an image of the certificate, or paste a PDF link below the preview." },
        { name: "valid_until", label: "Valid until", type: "date" },
      ],
    },
    company_partners: {
      table: "company_partners", title: "Partners & Investors", one: "partner", icon: "users",
      order: ["display_order", true], search: ["name"],
      filters: [{ name: "type", options: [["investor", "Investor"], ["certification_body", "Certification body"], ["partner", "Partner"]] }],
      list: [{ name: "logo_url", type: "image" }, { name: "name", strong: true }, { name: "type", type: "badge" }, { name: "display_order" }],
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "logo_url", label: "Logo", type: "image", required: true },
        { name: "type", label: "Type", type: "select", options: [["partner", "Partner"], ["investor", "Investor"], ["certification_body", "Certification body"]], default: "partner" },
        ORDER,
      ],
    },
    website_pages: {
      table: "website_pages", title: "Page SEO", one: "page", icon: "file",
      order: ["page_name", true], search: ["page_name", "slug", "meta_title"],
      list: [{ name: "page_name", strong: true, sub: "file_path" }, { name: "meta_title", type: "seo", max: 60 }, { name: "meta_description", type: "seo", max: 160 }, { name: "updated_at", type: "ago" }],
      fields: [
        { name: "page_name", label: "Page name", type: "text", required: true },
        { name: "slug", label: "Slug", type: "slug", from: "page_name", required: true },
        { name: "file_path", label: "File path", type: "text", required: true, help: "e.g. /critical-care.html" },
        { name: "meta_title", label: "Meta title", type: "text", max: 60 },
        { name: "meta_description", label: "Meta description", type: "textarea", rows: 3, max: 160 },
        { name: "og_image_url", label: "Share image", type: "image", help: "Shown when the page is shared on WhatsApp, LinkedIn etc. 1200 × 630 px." },
      ],
    },
  };

  window.NAV = [
    { group: "Overview", items: [["dashboard", "Dashboard", "home"]] },
    { group: "Leads", items: [["enquiries", "Enquiries", "inbox"], ["demo_requests", "Demo Requests", "calendar"]] },
    { group: "Catalogue", items: [["products", "Products", "box"], ["categories", "Categories", "grid"], ["product_types", "Product Types", "tag"], ["applications", "Applications", "layers"], ["certifications", "Product Certifications", "award"]] },
    { group: "Website", items: [["banners", "Banners", "image"], ["faqs", "FAQs", "help"], ["site_stats", "Site Stats", "bar"], ["facility_gallery", "Facility Gallery", "camera"], ["company_certifications", "Company Certificates", "award"], ["company_partners", "Partners & Investors", "users"], ["website_pages", "Page SEO", "file"]] },
    { group: "Network", items: [["distributors", "Distributors", "truck"], ["countries", "Countries", "globe"]] },
    { group: "Settings", items: [["team", "Team & Access", "shield"]] },
  ];
})();
