import React, { useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";

import "@/styles/globals.css";

const handlePageView = () => {
  const eventId = uuidv4();

  window.fbq("track", "PageView", {}, { eventID: eventId });

  setTimeout(() => {
    const serverSidePayload = JSON.stringify({
      eventName: "PageView",
      eventId,
      userAgent: navigator.userAgent,
      sourceUrl: window.location.href,
    });

    fetch("/api/fb-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: serverSidePayload,
    })
      .then((response) => {
        console.log("/api/fb-event response:", response);
      })
      .catch((error) => {
        console.error("/api/fb-event error:", error);
      });
  }, 250);
};

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    if (!router.asPath.includes("?")) {
      handlePageView();
    }

    router.events.on("routeChangeComplete", handlePageView);
    return () => {
      router.events.off("routeChangeComplete", handlePageView);
    };
  }, [router.events]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
        `,
        }}
      />
      <Component {...pageProps} />
    </>
  );
}
