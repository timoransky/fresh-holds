import { Suspense } from "react";
import { SignInModal } from "@/components/SignInModal";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default function InterceptedLoginPage({ searchParams }: Props) {
  return (
    <Suspense fallback={null}>
      <InterceptedLoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InterceptedLoginContent({ searchParams }: Props) {
  const { next } = await searchParams;
  return <SignInModal next={next ?? "/"} />;
}
