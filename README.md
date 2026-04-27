# ERP Accounting System
Advanced Software Engineering  Team:
Scott Schmidt, DaShawn Pfeifer, SeEun Chung, Suphanat Rojsiristith, Walter Zou


MVC is Model-View-Controller which is a way to organize your code into 3 roles. 
1. Model (Data) handles the database and data structure such as the tables users, invoices, and vendor.
2. View (UI) is what the user sees such as forms and the dashboards.
Example: Box Layout or Gidlayout 
3. Controller connects the model and view. 
Examples: mousePressed()

![ERP Diagram](UML-ERP.png)

## Architecture Diagram
Here is our diagram MVC image below:
# Software Architecture Template (MVC + Layered / N-tier)

# ERP Accounting System
Advanced Software Engineering  Team: 
Scott Schmidt, DaShawn Pfeifer, SeEun Chung, Suphanat Rojsiristith, Walter Zou

MVC is Model-View-Controller which is a way to organize your code into 3 roles. 
1. Model (Data) handles the database and data structure such as the tables users, invoices, and vendor.
2. View (UI) is what the user sees such as forms and the dashboards.
Example: Box Layout or Gidlayout 
3. Controller connects the model and view. 
Examples: mousePressed()


## Architecture Diagram
Here is our diagram MVC image below:
![pic](public/MVC_diagram.png)


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
- Component 7: Login and Logout

## Layer 3: Data Layer
- Component 6: Supabase Database 
Here are the tables, columns and connections in Supabase:

![pic](public/SupabaseERD.png)

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


## Testing Deliverables

### Formal Test Plan Table

| Class/Method | Test Type | Requirement Tested | Mock Used | Expected Result |
|---|---|---|---|---|
| `VendorService.createVendor()` | Black-box unit | `RQ-VEN-01`: Reject blank vendor name | `FakeVendorRepository` | Throws `Vendor name is required.` |
| `VendorService.createVendor()` | Black-box unit | `RQ-VEN-02`: Create vendor with normalized address | `FakeVendorRepository` | Returns `created=true`, address assembled correctly |
| `VendorService.createVendor()` | Black-box unit | `RQ-VEN-03`: Prevent duplicate vendor insert by name | `FakeVendorRepository` | Returns existing vendor, `created=false` |
| `InvoiceService.calculateTotals()` | Black-box unit | `RQ-INV-01`: Compute subtotal/tax/total from line items | None | Correct monetary totals returned |
| `InvoiceService.validateLineItems()` | Black-box unit | `RQ-INV-02`: Validate invalid line items | None | Returns descriptive validation errors |
| `InvoiceApplicationService.createInvoiceForUser()` | Black-box unit | `RQ-INV-03`: Persist invoice using computed total only | `FakeInvoiceRepository` | Repository receives computed `amount` |
| `PaymentService.createVoucherPayment()` | Black-box unit | `RQ-PAY-01`: Fail when no invoices selected | `FakePaymentRepository` | Throws `No invoices selected.` |
| `PaymentService.createVoucherPayment()` | Black-box unit | `RQ-PAY-02`: Fail when invoice missing/already paid | `FakePaymentRepository` | Throws missing/already-paid invoice error |
| `PaymentService.createVoucherPayment()` | Black-box unit | `RQ-PAY-03`: Successful voucher/payment creation and invoice paid update | `FakePaymentRepository` | Payment created, links inserted, invoices marked paid |

### Core Production Class Coverage

| Core Class | Covered by Tests | Test File |
|---|---|---|
| `VendorService` | Yes | `src/tests/vendor-service.test.ts` |
| `InvoiceService` | Yes | `src/tests/invoice-service.test.ts` |
| `InvoiceApplicationService` | Yes | `src/tests/invoice-service.test.ts` |
| `PaymentService` | Yes | `src/tests/payment-service.test.ts` |

### Black-box Unit Test Descriptions (Requirement Traceability)

- `RQ-VEN-01`: Vendor name cannot be blank; whitespace input fails.
- `RQ-VEN-02`: Valid vendor input creates a normalized address and returns `created=true`.
- `RQ-VEN-03`: Existing vendor name returns existing row (`created=false`) instead of reinserting.
- `RQ-INV-01`: Invoice totals are correctly computed from line items.
- `RQ-INV-02`: Invalid line-item fields return clear validation errors.
- `RQ-INV-03`: Invoice persistence uses computed total amount.
- `RQ-PAY-01`: Voucher creation fails when no invoices are selected.
- `RQ-PAY-02`: Missing or already-paid invoices are rejected.
- `RQ-PAY-03`: Successful voucher flow creates payment, links invoices, and updates paid status.

### White-box Test Section

White-box algorithm: `PaymentService.createVoucherPayment()` in `src/lib/payment/payment-service.ts`.

Main branches:
1. `if (!invoiceIds.length)`
2. `if (!input.accountId || !input.paymentDate || !payType)`
3. `if (!ALLOWED_PAY_TYPES.has(payType))`
4. `if (!invoiceRows.length)`
5. `if (missingOrPaidIds.length)`
6. `if (accountMismatch)`
7. `if (shouldMarkInvoicesPaidNow(input.paymentDate))`

### CFG Diagram (Payment Voucher Algorithm)

```mermaid
flowchart TD
  A[Start createVoucherPayment] --> B{Any invoice IDs?}
  B -- No --> E1[Throw No invoices selected]
  B -- Yes --> C{Required fields present?}
  C -- No --> E2[Throw Missing required payment data]
  C -- Yes --> D{Pay type allowed?}
  D -- No --> E3[Throw Invalid payment type]
  D -- Yes --> F[Begin transaction]
  F --> G[Load unpaid invoices]
  G --> H{Any unpaid invoices loaded?}
  H -- No --> E4[Throw No valid unpaid invoices]
  H -- Yes --> I{Any missing/already-paid IDs?}
  I -- Yes --> E5[Throw missing/already-paid error]
  I -- No --> J{Account matches all invoices?}
  J -- No --> E6[Throw account mismatch]
  J -- Yes --> K[Calculate total + create payment + link invoices]
  K --> L{Payment date <= today?}
  L -- Yes --> M[Mark invoices paid]
  L -- No --> N[Sync invoice paid status]
  M --> O[Return success result]
  N --> O
```

### Cyclomatic Complexity

For `PaymentService.createVoucherPayment()`:

- Decision points = 7
- `V(G) = D + 1 = 7 + 1 = 8`

### Independent Paths

- `P1`: No invoice IDs -> error
- `P2`: Invoice IDs present but required fields missing -> error
- `P3`: Invalid pay type -> error
- `P4`: No unpaid invoice rows -> error
- `P5`: Missing/already-paid IDs detected -> error
- `P6`: Account mismatch -> error
- `P7`: Success path with `paymentDate <= today` -> mark paid -> success
- `P8`: Success path with `paymentDate > today` -> sync status -> success

