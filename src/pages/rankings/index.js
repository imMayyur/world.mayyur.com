// Redirect /rankings to the default population ranking.
export async function getServerSideProps() {
  return { redirect: { destination: "/rankings/population", permanent: false } };
}

export default function RankingsIndex() {
  return null;
}
