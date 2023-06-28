import React, { useState, useRef, useEffect } from "react";
import {
  IonButtons,
  IonButton,
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonPage,
  IonItem,
  IonInput,
  IonRadioGroup,
  IonRadio,
  IonSpinner,
  IonList,
  useIonToast,
  IonText,
  IonRouterLink,
  useIonModal,
} from "@ionic/react";
import styled from "@emotion/styled";
import { POPULAR_SERVERS } from "../../helpers/lemmy";
import { useAppDispatch } from "../../store";
import { login } from "./authSlice";
import { LemmyHttp } from "lemmy-js-client";
import { getClient } from "../../services/lemmy";
import { IonInputCustomEvent } from "@ionic/core";
import TermsSheet from "../settings/terms/TermsSheet";

export const Spinner = styled(IonSpinner)`
  width: 1.5rem;
`;

export const Centered = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const HelperText = styled.p`
  margin-left: 2rem;
  margin-right: 2rem;
`;

export default function Login({
  onDismiss,
}: {
  onDismiss: (data?: string | null | undefined | number, role?: string) => void;
}) {
  const [present] = useIonToast();
  const dispatch = useAppDispatch();
  const [server, setServer] = useState(POPULAR_SERVERS[0]);
  const [customServer, setCustomServer] = useState("");
  const [serverConfirmed, setServerConfirmed] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectURI, setRedirectURI] = useState("");
  const [agent, setAgent] = useState("");
  const usernameRef = useRef<IonInputCustomEvent<never>["target"]>(null);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef();
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp] = useState("");

  const [presentTerms, onDismissTerms] = useIonModal(TermsSheet, {
    onDismiss: (data: string, role: string) => onDismissTerms(data, role),
  });

  useEffect(() => {
    if (!serverConfirmed) return;

    setTimeout(() => {
      // This hack is incredibly annoying
      usernameRef.current?.getInputElement().then((el) => el.focus());
    }, 200);
  }, [serverConfirmed]);

  useEffect(() => {
    setCustomServer("");
  }, [server]);

  async function submit() {
    if (!clientId || !clientSecret || !agent || !redirectURI) {
      present({
        message: "Please fill out all fields",
        duration: 3500,
        position: "bottom",
        color: "danger",
      });
      return;
    }

    setLoading(true);

    try {
      await dispatch(
          login(
              clientId,
              clientSecret,
              redirectURI,
              agent
          )
      );
    } catch (error) {
      if (error === "missing_totp_token") {
        setNeedsTotp(true);
        return;
      }

      present({
        message: "Please check your credentials and try again.",
        duration: 3500,
        position: "bottom",
        color: "danger",
      });

    } finally {
      setLoading(false);
    }

    onDismiss();
    present({
      message: "Login successful",
      duration: 2000,
      position: "bottom",
      color: "success",
    });
  }

  return (
      <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
      >
        <input type="submit"/> {/* Hack */}
        <IonPage ref={pageRef}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton
                    color="medium"
                    onClick={() => {
                      setClientId("");
                      setClientSecret("");
                      setRedirectURI("");
                      setAgent("");
                      onDismiss();
                    }}
                >
                  Cancel
                </IonButton>
              </IonButtons>
              <IonTitle>
                <Centered>Login {loading && <Spinner color="dark"/>}</Centered>
              </IonTitle>
              <IonButtons slot="end">
                <IonButton strong={true} type="submit" disabled={!clientId || !clientSecret || !redirectURI || !agent}>
                  Next
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <HelperText>Enter your credentials</HelperText>
            <IonList inset>
              <IonItem>
                <IonInput
                    label="Client ID"
                    inputMode="text"
                    value={clientId}
                    onIonInput={(e) => setClientId(e.target.value)}
                    disabled={loading}
                />
              </IonItem>
              <IonItem>
                <IonInput
                    label="Client Secret"
                    inputMode="text"
                    value={clientSecret}
                    onIonInput={(e) => setClientSecret(e.target.value)}
                    disabled={loading}
                />
              </IonItem>
              <IonItem>
                <IonInput
                    label="Redirect URI"
                    inputMode="url"
                    value={redirectURI}
                    onIonInput={(e) => setRedirectURI(e.target.value)}
                    disabled={loading}
                />
              </IonItem>
              <IonItem>
                <IonInput
                    label="Agent"
                    inputMode="text"
                    value={agent}
                    onIonInput={(e) => setAgent(e.target.value)}
                    disabled={loading}
                />
              </IonItem>
            </IonList>

            <HelperText>
              <IonRouterLink onClick={() => presentTerms()}>
                Privacy &amp; Terms
              </IonRouterLink>
            </HelperText>

            <HelperText>
              <IonRouterLink
                  href="https://www.reddit.com/prefs/apps"
                  target="_blank"
                  rel="noopener noreferrer"
              >
                <IonText color="primary">Don&apos;t have an API Key?</IonText>
              </IonRouterLink>
            </HelperText>
          </IonContent>
        </IonPage>
      </form>
  );
}