import { useQuery } from "@tanstack/react-query";

const getCustomersService = async (): Promise<
  {
    customer_id: string;
    contact_name: string;
    company_name: string;
    city: string;
    country: string;
  }[]
> => {
  const response = await fetch("http://localhost:3001/northwind/customers");
  const data = await response.json();
  return data;
};

const Customers = () => {
  
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomersService,
  });

  return (
    <>
      <h2>Clientes</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Empresa</th>
            <th>Ciudad</th>
            <th>País</th>
          </tr>
        </thead>
        <tbody>
          {customers ? (
            customers.map((customer, idx) => {
              return (
                <tr
                  style={{
                    backgroundColor: `${idx % 2 === 0 ? "gray" : "green"}`,
                  }}
                  key={customer.customer_id}
                >
                  <td style={{ padding: "12px" }}>{customer.contact_name}</td>
                  <td style={{ padding: "12px" }}>{customer.company_name}</td>
                  <td style={{ padding: "12px" }}>{customer.city}</td>
                  <td style={{ padding: "12px" }}>{customer.country}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4}>There are no customer.</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

export default Customers;
