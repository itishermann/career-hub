import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { Providers } from "@/styles/Providers";

export const metadata: Metadata = {
  title: "career-hub",
  description: "Personal career hub — profile, journal, CV & cover letter generation.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-density="dense"
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
