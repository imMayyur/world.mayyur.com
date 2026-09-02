import { SITE_URL } from "../lib/site";

function Robots() {
  return null;
}

export async function getServerSideProps({ res }) {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.write(body);
  res.end();
  return { props: {} };
}

export default Robots;
