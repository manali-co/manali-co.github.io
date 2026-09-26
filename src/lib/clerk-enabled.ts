/* Clerk is on only when the publishable key looks real. A placeholder such as "pk_..." left in an
   env table would otherwise crash every request inside clerkMiddleware. */
export const clerkEnabled = /^pk_(test|live)_[A-Za-z0-9]+$/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "");
