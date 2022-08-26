import type { MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  useCatch,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import tailwindStylesheetUrl from "./styles/tailwind.css";
import { ChakraProvider } from '@chakra-ui/react'


export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: tailwindStylesheetUrl }
  ];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "OCI Self-Service VM Instance Management",
  viewport: "width=device-width,initial-scale=1",
});

export default function App({ children }: React.PropsWithChildren<{}>) {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <ChakraProvider>
          <Outlet />
          {children}
          <ScrollRestoration />
          <Scripts />
          {process.env.NODE_ENV === "development" ? (
            <LiveReload />
          ) : null}
        </ChakraProvider>      
      </body>
    </html>
  );
}


export function CatchBoundary() {
  let caught = useCatch();

  let message;
  switch (caught.status) {
    case 404:
      message = <p>Oh no sorry! This page does not exist</p>
      break;
    // You can customize the behavior for other status codes
    default:
      throw new Error(caught.data || caught.statusText);
  }

  return (
    <App>
        <h1>
          {caught.status}: {caught.statusText}
        </h1>
        {message}
    </App>
  );
}