import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonList,
  IonPage,
  IonPicker,
  IonText,
  IonTitle,
  IonToolbar,
  useIonModal,
  useIonViewWillEnter,
} from "@ionic/react";
import AppContent from "../../features/shared/AppContent";
import {
  handleSelector,
  jwtSelector,
  updateConnectedInstance,
  finishLogin
} from "../../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import Login from "../../features/auth/Login";
import { useContext, useRef, useState } from "react";
import { InsetIonItem, SettingLabel } from "../../features/user/Profile";
import { ReactComponent as IncognitoSvg } from "../../features/user/incognito.svg";
import styled from "@emotion/styled";
import UserPage from "../shared/UserPage";
import { AppContext } from "../../features/auth/AppContext";
import { swapHorizontalOutline } from "ionicons/icons";
import { css } from "@emotion/react";
import AccountSwitcher from "../../features/auth/AccountSwitcher";
import { PageContext } from "../../features/auth/PageContext";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const pageRef = useRef();
  const { setActivePage } = useContext(AppContext);
  const connectedInstance = useAppSelector(
    (state) => state.auth.connectedInstance
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const jwt = useAppSelector(jwtSelector);
  const [login, onDismiss] = useIonModal(Login, {
    onDismiss: (data: string, role: string) => onDismiss(data, role),
  });

  const pageContext = useContext(PageContext);
  const handle = useAppSelector(handleSelector);


  const [presentAccountSwitcher, onDismissAccountSwitcher] = useIonModal(
    AccountSwitcher,
    {
      onDismiss: (data: string, role: string) =>
        onDismissAccountSwitcher(data, role),
      page: pageContext.page,
    }
  );

  useIonViewWillEnter(() => {
    if (pageRef.current) setActivePage(pageRef.current);
  });

  function getCodeFromURI() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
  }

  const code = getCodeFromURI()
  if (code){
    finishLogin(code)
  }

  if (jwt)
    return (
      <UserPage
        handle={handle}
        toolbar={
          <IonButton
            onClick={() => presentAccountSwitcher({ cssClass: "small" })}
          >
            Accounts
          </IonButton>
        }
      />
    );

  return (
    <IonPage ref={pageRef}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Anonymous</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => login({ presentingElement: pageRef.current })}
            >
              Login
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <AppContent scrollY>
        <IonText color="medium">
          <p
            css={css`
              font-size: 0.9em;
              padding: 1rem;
            `}
          >
            Click <strong>login</strong> to sign in to your Reddit account.
            You'll need your own API key.
          </p>
        </IonText>
        <IonList inset>
        </IonList>
      </AppContent>
    </IonPage>
  );
}
