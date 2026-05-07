import { SignInModal } from "@/components/SignInModal";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function InterceptedLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <SignInModal next={next ?? "/"} />;
}
