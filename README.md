ERP Accounting System
Course: IT 426 – Advanced Software Engineering  Team:
Scott Schmidt, DaShawn Pfeifer, SeEun Chung, Suphanat Rojsiristith, Walter Zou

MVC is Model-View-Controller which is a way to organize your code into 3 roles. 
1. Model (Data) handles the database and data structure such as the tables users, invoices, and vendor.
2. View (UI) is what the user sees such as forms and the dashboards.
Example: Box Layout or Gidlayout 
3. Controller connects the model and view. 
Examples: mousePressed()


## Architecture Diagram
Here is our diagram MVC image below:
# Software Architecture Template (MVC + Layered / N-tier)

ERP Accounting System
Course: IT 426 – Advanced Software Engineering  Team:
Scott Schmidt, DaShawn Pfeifer, SeEun Chung, Suphanat Rojsiristith, Walter Zou

MVC is Model-View-Controller which is a way to organize your code into 3 roles. 
1. Model (Data) handles the database and data structure such as the tables users, invoices, and vendor.
2. View (UI) is what the user sees such as forms and the dashboards.
Example: Box Layout or Gidlayout 
3. Controller connects the model and view. 
Examples: mousePressed()


## Architecture Diagram
Here is our diagram MVC image below:
![alt text](UML-ERP.png)


## Data Flow Between Layers
When a user interacts with the system (e.g., submits a form), the request starts in the Presentation Layer. The request is then passed to the Application Layer, where business logic and authentication are applied. The Application Layer communicates with the Data Layer to store or retrieve information from the database. The result is then returned back through the Application Layer to the Presentation Layer, where it is displayed to the user.

## Layer 1: Presentation Layer

-Component1: Index
Example: Display main content of application
- Component 2:  Header
Examples: Logo, title, navigation
- Component 3:  Navigation
Examples: Menus and forms
- Component 4:  Route Pages

## Layer 2: Application Layer
This is the “bain” of the application that contains business logic, rules, and actions:
- Component 4: CreateInvoice
- Component 5: CreateUser
- Component 6: getVendors
-Component 7: Login and Logout

## Layer 3: Data Layer
- Component 6: Supabase Database 
Here are the tables, columns and connections in Supabase:

![alt text](SupabaseERD.png)

---

## MVC Mapping

- **View:** React UI components such as Dashboard, Login/Register pages, Vendor List page, Add Vendor form, and Invoice form
- **Controller:** API routes and server functions including form handlers, authentication logic, and request processing
- **Model:** Database models and schemas such as User, Vendor, and Invoice using Supabase

---

## Component Communication

1.The invoice page sends form data (vendor, date, amount) to the createInvoice function.
2. CreateInvoice checks the user and saves the invoice to the database.
3.The database saves the invoice and sends the result back.
4. The page shows success and redirects to the invoice list.

---

## Notes

- Why this architecture fits the project: This architecture fits the project because it separates the user interface, business logic, and data management, making the ERP system easier to develop, test, and maintain.
- Any limitations/future improvements: A limitation is that the system can become more complex as the project grows, so future improvements could include clearer service separation, stronger validation, and better scalability support.


## Getting Started NPM 
>>>>>>> Stashed changes

```bash
npm install
npm run dev
```

# Building For Production

To build this application for production:

```bash
npm run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
npm run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `npm install @tailwindcss/vite tailwindcss -D`

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "My App" },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
});
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from "@tanstack/react-start";

const getServerTime = createServerFn({
  method: "GET",
}).handler(async () => {
  return new Date().toISOString();
});

// Use in a component
function MyComponent() {
  const [time, setTime] = useState("");

  useEffect(() => {
    getServerTime().then(setTime);
  }, []);

  return <div>Server time: {time}</div>;
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";

export const Route = createFileRoute("/api/hello")({
  server: {
    handlers: {
      GET: () => json({ message: "Hello, World!" }),
    },
  },
});
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/people")({
  loader: async () => {
    const response = await fetch("https://swapi.dev/api/people");
    return response.json();
  },
  component: PeopleComponent,
});

function PeopleComponent() {
  const data = Route.useLoaderData();
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  );
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
