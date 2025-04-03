import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import edit from "../assets/edit.svg";
import trash from "../assets/trash-x.svg";
import styles from "./styles.module.css";

import { isWalletValid } from "r2c-wallet-validator";

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
    formState: { isValid },
    setValue,
    reset,
    trigger,
  } = useForm<FormData>();

  const validateWalletAddress = (value: string) => {
    return isWalletValid(value).valid;
  };

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
    reset();
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
    trigger();
  };

  const editContactHandler = (data: FormData) => {
    updateContactMutation(data);
    reset();
    setFormMode("add");
  };

  return (
    <>
      <header style={{ backgroundColor: "#1a1a1a", padding: "12px" }}>
        <p>Introduce la información para crear un nuevo contacto:</p>
        {response && "message" in response && (
          <p className={styles.errorMessage}>{response.message}</p>
        )}
        <form className={styles.form} onSubmit={handleSubmit(submitHandler)}>
          <label>
            Nombre:
            <input type="text" {...register("name", { required: true })} />
          </label>

          <label>
            Dirección de la billetera:
            <input
              type="text"
              {...register("walletAddress", {
                required: true,
                validate: validateWalletAddress,
              })}
            />
          </label>

          <button className={styles.button} type="submit" disabled={!isValid}>
            {formMode === "add" ? "Añadir" : "Actualizar"}
          </button>
        </form>
      </header>

      <h2>Lista de contactos</h2>
      {contacts && contacts.length === 0 ? (
        <p>No tienes ningún contacto registrado.</p>
      ) : (
        <table width={"100%"} cellPadding={12} cellSpacing={0}>
          <thead>
            <tr
              style={{
                backgroundColor: "#1a1a1a",
                fontWeight: "bold",
                fontSize: "20px",
              }}
            >
              <td width={200}>Nombre</td>
              <td>Dirección de la billetera</td>
              <td>&nbsp;</td>
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
                    <td>
                      <span
                        style={{ fontFamily: "monospace", fontSize: "20px" }}
                      >
                        {contact.walletAddress}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <img
                          style={{
                            backgroundColor: "#ff000088",
                            borderRadius: "20%",
                            cursor: "pointer",
                          }}
                          src={trash}
                          alt=""
                          onClick={removeContactHandler.bind(null, contact)}
                        />
                        <img
                          style={{
                            backgroundColor: "#0000ff88",
                            borderRadius: "20%",
                            cursor: "pointer",
                          }}
                          src={edit}
                          alt=""
                          onClick={loadContactData.bind(null, contact)}
                        />
                      </div>
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
