import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderArgs) {
    return redirect("/regions");
  }

export default function IndexRoute() {
    return (<div />)
}