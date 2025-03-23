import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import styles from "./styles.module.css";

type FormData = {
  id?: string;
  name: string;
  walletAddress: string;
};

const Contacts = () => {
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"add" | "edit">("add");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const submitHandler = (data: FormData) => {
    if (formMode === "add") {
      addContactHandler(data);
    } else if (formMode === "edit") {
      editContactHandler(data);
    }
  };

  const { mutate: createContactMutation, data: response } = useMutation({
    mutationFn: async (data: FormData) => {
      const user = JSON.parse(window.localStorage.getItem("user") ?? "");

      const response = await fetch(
        `http://localhost:3000/contacts_book/${user.contactsBook.contactsBookId}/contact`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            walletAddress: data.walletAddress,
          }),
        }
      );

      return await response.json();
    },
    onSuccess: (data) => {
      contacts.push(data);
    },
  });

  const addContactHandler = (data: FormData) => {
    createContactMutation(data);
  };

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const user = JSON.parse(window.localStorage.getItem("user") ?? "");
      const response = await fetch(
        `http://localhost:3000/contacts_book/${user.contactsBook.contactsBookId}/contacts`
      );
      return await response.json();
    },
  });

  const { mutate: deleteContactMutation } = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await fetch(
        `http://localhost:3000/contact/${contactId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return await response.json();
    },
    onMutate: async (contactId: string) => {
      await queryClient.cancelQueries({ queryKey: ["contacts"] });
      const previousContacts = queryClient.getQueryData(["contacts"]);
      queryClient.setQueryData(
        ["contacts"],
        (
          previousContacts: {
            id: string;
            name: string;
            walletAddress: string;
          }[]
        ) => {
          return previousContacts.filter(
            (contacts) => contacts.id !== contactId
          );
        }
      );
      return { previousContacts } as { previousContacts: FormData[] };
    },
    onError: (_err, _, context) => {
      queryClient.setQueryData(["contacts"], context?.previousContacts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const removeContactHandler = (data: FormData) => {
    deleteContactMutation(data.id!);
  };

  const { mutate: updateContactMutation } = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`http://localhost:3000/contact/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          walletAddress: data.walletAddress,
        }),
      });

      return await response.json();
    },
    onSuccess: (data) => {
      contacts.map(
        (contact: { id: string; name: string; walletAddress: string }) => {
          if (contact.id === data.id) {
            contact.name = data.name;
            contact.walletAddress = data.walletAddress;
          }
        }
      );
    },
  });

  const loadContactData = (data: FormData) => {
    setValue("id", data.id);
    setValue("name", data.name);
    setValue("walletAddress", data.walletAddress);
    setFormMode("edit");
  };

  const editContactHandler = (data: FormData) => {
    updateContactMutation(data);
  };

  return (
    <>
      <header style={{ backgroundColor: "#1a1a1a", padding: "12px" }}>
        <p>Introduce la información para crear un nuevo contacto:</p>
        {response && "message" in response && (
          <p className={styles.errorMessage}>{response.message}</p>
        )}
        <form
          className={styles.loginForm}
          onSubmit={handleSubmit(submitHandler)}
        >
          <label>
            Nombre:
            <input type="text" {...register("name", { required: true })} />
          </label>
          {errors.name && (
            <small>Debes introducir el nombre del contacto.</small>
          )}
          <label>
            Dirección de la billetera:
            <input
              type="text"
              {...register("walletAddress", { required: true, minLength: 6 })}
            />
          </label>
          {errors.walletAddress && (
            <small>La dirección de la billetera no es válida.</small>
          )}
          <button className={styles.button} type="submit">
            {formMode === "add" ? "Añadir" : "Actualizar"}
          </button>
        </form>
      </header>
      <h2>Lista de contactos</h2>
      {contacts && contacts.length === 0 ? (
        <p>No tienes ningún contacto registrado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección de la billetera</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {contacts &&
              contacts.map(
                (contact: {
                  id: string;
                  name: string;
                  walletAddress: string;
                }) => (
                  <tr key={contact.name}>
                    <td>{contact.name}</td>
                    <td>{contact.walletAddress}</td>
                    <td>
                      <button
                        className={styles.button}
                        onClick={removeContactHandler.bind(null, contact)}
                      >
                        Eliminar
                      </button>
                      <button
                        className={styles.button}
                        onClick={loadContactData.bind(null, contact)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              )}
          </tbody>
        </table>
      )}
    </>
  );
};

export default Contacts;
