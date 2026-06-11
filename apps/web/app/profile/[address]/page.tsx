import { ProfileView } from "@/components/ProfileView";

export default async function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <ProfileView address={decodeURIComponent(address)} />;
}
