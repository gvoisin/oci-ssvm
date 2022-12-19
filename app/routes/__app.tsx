import { Form, Link, NavLink, Outlet, useTransition } from "@remix-run/react";

export default function Index() {
  return (
    <div className="relative flex h-full rounded-lg bg-white text-gray-600">
      <div className="border-r border-gray-100 bg-gray-50">
       <div className="p-4">
          <div className="flex flex-wrap items-center gap-1">
            <Link to=".">
              Home
            </Link>
          </div>
          <div className="h-7" />
          <div className="flex flex-col font-bold text-gray-800">
            {/* <NavItem to="regions">Regions</NavItem> */}
            <NavItem to="workstations">Dev Workstations</NavItem>
            {/* <NavItem to="compartments">Compartments</NavItem> */}
            {/*<NavItem to="sales">Sales</NavItem>
            <NavItem to="expenses">Expenses</NavItem>
            <NavItem to="reports">Reports</NavItem> */}
          </div>
        </div>
      </div>
      <div className="flex-1">
      <header className="flex items-center justify-between bg-red-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
        </h1>
        <h1 className="text-5xl font-bold">WORKSTATIONS</h1>
        <Form action="/logout" method="post">
          <button
            type="submit"
            className="rounded bg-white-200 py-2 px-4 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
          >
            Logout
          </button>
        </Form>
      </header>

        <Outlet />
      </div>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      // prefetch="intent"
      className={({ isActive }) =>
        `my-1 py-1 px-2 pr-16 text-[length:14px] ${
          isActive ? "rounded-md bg-gray-100" : ""
        }`
      }
    >
      {children}
    </NavLink>
  );
}
