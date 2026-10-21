# Pulse Admin

Admin panel for **pulseio.in**: products, categories, website content (banners, FAQs, stats, gallery, certificates, partners, page SEO), distributors, and leads (enquiries and demo requests).

- **Front end:** static HTML/CSS/JS, no build step. Open `index.html` or deploy the folder to Vercel.
- **Data and logins:** Supabase project `Pulseio`. Row-level security means only users with `profiles.is_admin = true` can read leads or change anything.
- `js/config.js` holds only the public publishable key. Never put the `service_role` key in this repository.

## Pages
| Section | Pages |
|---|---|
| Overview | Dashboard |
| Leads | Enquiries, Demo Requests (status, assignment, WhatsApp/call, CSV export) |
| Catalogue | Products (specs, photos, applications, certifications, SEO), Categories, Product Types, Applications, Product Certifications |
| Website | Banners, FAQs, Site Stats, Facility Gallery, Company Certificates, Partners & Investors, Page SEO |
| Network | Distributors, Countries |
| Settings | Team & Access |

## Adding a page for a new table
Add an entry to `js/resources.js` (table, list columns, form fields) and a line in `NAV`. The list and form are built automatically.

## Adding an admin
Supabase → Authentication → Users → Add user. They appear in **Team & Access**; switch on **Admin access**.
