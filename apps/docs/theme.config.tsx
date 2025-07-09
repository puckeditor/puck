/* eslint-disable react-hooks/rules-of-hooks */
import { useRouter } from "next/router";
import { DocsThemeConfig, useConfig } from "nextra-theme-docs";

import { ReleaseSwitcher } from "./components/ReleaseSwitcher";
import { FooterActions } from "./components/FooterActions";
import { Viewport } from "./components/Viewport";

const Head = () => {
  const { asPath, defaultLocale, locale } = useRouter();
  const { frontMatter, title } = useConfig();

  const siteUrl = "https://puckeditor.com";
  const url =
    siteUrl + (defaultLocale === locale ? asPath : `/${locale}${asPath}`);

  const defaultTitle = `Puck - The open-source visual editor for React`;
  const description =
    frontMatter.description ||
    `Puck empowers developers to build amazing visual editing experiences into their own React applications, powering the next generation of content tools.`;

  return (
    <>
      <link rel="canonical" href={`${siteUrl}${asPath}`} />
      <meta property="og:url" content={url} />
      <meta property="description" content={description} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${siteUrl}/social.png`} />
      <meta property="og:image:height" content="675" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:alt" content="Puck" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:locale" content="en" />
      <meta property="og:site_name" content={defaultTitle} />
      <meta name="image" content={`${siteUrl}/social.png`} />
      <meta itemProp="image" content={`${siteUrl}/social.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={`${siteUrl}/social.png`} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image:alt" content="Puck" />
      <meta name="twitter:image:height" content="675" />
      <meta name="twitter:image:type" content="image/png" />
      <meta name="twitter:image:width" content="1200" />
      <meta name="twitter:site" content="@puckeditor" />
      <meta
        name="twitter:title"
        content={title !== defaultTitle ? `${title} - Puck` : defaultTitle}
      />
      <title>{title !== defaultTitle ? `${title} - Puck` : defaultTitle}</title>

      <link rel="icon" href="/favicon.ico" sizes="48x48" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: `{
      "@context" : "https://schema.org",
      "@type" : "WebSite",
      "name" : "Puck",
      "url" : "https://puckeditor.com/"
    }`,
        }}
      />
      {asPath == "/" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: `${JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Puck",
              url: siteUrl,
            })}`,
          }}
        />
      )}
    </>
  );
};

const theme: DocsThemeConfig = {
  head: Head,
  logo: (
    <div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1300 326"
        width="1300"
        height="326"
        style={{ width: 128, marginBottom: -5, height: 32 }}
        fill="currentColor"
      >
        <path d="M368.9 5.9H455c48.1 0 88.1 15.4 88.1 70.4 0 54.4-37 71.1-85.8 71.1H420v90.4h-51.1V5.9zm51.1 98.2h34c18 0 36-6.2 36-27.8 0-23.9-24.2-27.2-43.9-27.2H420v55zM786 148.3c0 54.7-33.4 95.3-97.6 95.3-64.5 0-97.9-40.6-97.9-95.3V5.9h51.1v140.5c0 28.5 19.6 50.1 46.8 50.1 26.8 0 46.5-21.6 46.5-50.1V5.9H786v142.4zM997.1 66.1c-10.1-12.1-24.9-19-43.9-19-38.6 0-67.1 31.4-67.1 74.7s28.5 74.7 65.5 74.7c20.6 0 37.3-9.2 47.8-24.9l42.6 31.8c-19.3 27.5-52.1 40.3-83.8 40.3-72.4 0-125.1-47.5-125.1-121.8C833.1 47.5 885.8 0 958.2 0c25.9 0 58.6 8.8 78.3 34.1l-39.4 32zM1083.2 5.9h51.1v96.3l90-96.3h66.8L1188 113.6l112 124.1h-71.4l-94.3-110v110h-51.1V5.9zM149.3 237.7H82.5v-24.4h66.9v24.4zm82.5-82.5h-24.4V88.4h24.4v66.8zm-207.4 0H0V88.4h24.4v66.8zM149.3 30.3H82.5V5.9h66.9v24.4zM45.6 237.7H0v-45.6h24.4v21.2h21.2v24.4zM231.8 51.5h-24.4V30.3h-21.2V5.9h45.6v45.6zm-207.4 0H0V5.9h45.6v24.4H24.4v21.2zM164.8 170.7l27.5 155.2L320 198.2l-155.2-27.5z" />
      </svg>
    </div>
  ),
  project: {
    link: "https://github.com/measuredco/puck",
  },
  footer: {
    content: (
      <div className="flex w-full flex-col items-center sm:items-start">
        <p className="mt-6 text-xs">
          MIT © {new Date().getFullYear()}{" "}
          <a
            style={{ textDecoration: "underline" }}
            href="https://github.com/measuredco/puck/graphs/contributors"
          >
            The Puck Contributors
          </a>
        </p>
      </div>
    ),
  },
  chat: {
    link: "https://discord.gg/D9e4E3MQVZ",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        preserveAspectRatio="xMidYMid"
        viewBox="0 -28.5 256 256"
        fill="currentColor"
      >
        <path d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.809 207.809 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0 0 79.735 175.3a136.413 136.413 0 0 1-21.846-10.632 108.636 108.636 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 0 0 5.355 4.237 136.07 136.07 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18Z" />
      </svg>
    ),
  },
  toc: {
    backToTop: true,
  },
  banner:
    process.env.NEXT_PUBLIC_IS_LATEST === "true"
      ? {
          dismissible: true,
          key: "v0.18.0",
          content: (
            <a
              href="https://github.com/measuredco/puck/releases"
              target="_blank"
            >
              <b>🎈 Puck 0.18</b>: The new drag-and-drop engine is here, with
              CSS grid & flexbox support →
            </a>
          ),
        }
      : {},
  docsRepositoryBase: "https://github.com/measuredco/puck/tree/main/apps/docs",
  navbar: {
    extraContent: () => (
      <Viewport desktop>
        <ReleaseSwitcher />
      </Viewport>
    ),
  },
  themeSwitch: {
    component: FooterActions,
  },
};

export default theme;
