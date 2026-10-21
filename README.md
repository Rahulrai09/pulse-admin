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

## Team & Access
In the panel, **Team & Access → Add team member** creates a login with a temporary password (no email sent) and shows it once to copy or send on WhatsApp. The shield button gives someone a new temporary password; the bin deletes their login. Everyone can change their own password at the bottom of the page.

These actions run in the Supabase Edge Function `team-admin` (source in `supabase/functions/team-admin/`). It checks the caller is an admin and uses the service-role key inside Supabase only; the key is never in this repo or the browser.
