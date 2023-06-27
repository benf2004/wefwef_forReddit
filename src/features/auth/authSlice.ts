import { PayloadAction, createSelector, createSlice } from "@reduxjs/toolkit";
import { snoowrap } from "@snoowrap"
import { GetSiteResponse, LemmyHttp } from "lemmy-js-client";
import { AppDispatch, RootState } from "../../store";
import Cookies from "js-cookie";
import { LemmyJWT, getRemoteHandle } from "../../helpers/lemmy";
import { resetPosts } from "../post/postSlice";
import { getClient } from "../../services/lemmy";
import { resetComments } from "../comment/commentSlice";
import { resetUsers } from "../user/userSlice";
import { resetInbox } from "../inbox/inboxSlice";
import { differenceWith, uniqBy } from "lodash";

const MULTI_ACCOUNT_STORAGE_NAME = "credentials";

// Migrations
(() => {
  // 2023-06-25 clean up cookie used for old versions
  Cookies.remove("jwt");

  // 2023-06-26 prefer localStorage to avoid sending to proxy server
  const cookie = Cookies.get(MULTI_ACCOUNT_STORAGE_NAME);

  if (cookie && !localStorage.getItem(MULTI_ACCOUNT_STORAGE_NAME)) {
    localStorage.setItem(MULTI_ACCOUNT_STORAGE_NAME, cookie);
    Cookies.remove(MULTI_ACCOUNT_STORAGE_NAME);
  }
})();

/**
 * DO NOT CHANGE this type. It is persisted in the login cookie
 */
export interface Credential {
  username: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string;
}

/**
 * DO NOT CHANGE this type. It is persisted in localStorage
 */
type CredentialStoragePayload = {
  accounts: Credential[];
  activeAccount: string;
};

interface PostState {
  accountData: CredentialStoragePayload | undefined;
  site: GetSiteResponse | undefined;
  connectedInstance: string;
}

const initialState: (connectedInstance?: string) => PostState = (
  connectedInstance = ""
) => ({
  accountData: getCredentialsFromStorage(),
  site: undefined,
  connectedInstance,
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    addAccount: (state, action: PayloadAction<Credential>) => {
      if (!state.accountData) {
        state.accountData = {
          accounts: [action.payload],
          activeHandle: action.payload.handle,
        };
      }

      const accounts = uniqBy(
        [action.payload, ...state.accountData.accounts],
        (c) => c.handle
      );

      state.accountData = {
        accounts,
        activeHandle: action.payload.handle,
      };

      updateCredentialsStorage(state.accountData);
    },
    removeAccount: (state, action: PayloadAction<string>) => {
      if (!state.accountData) return;

      const accounts = differenceWith(
        state.accountData.accounts,
        [action.payload],
        (a, b) => a.handle === b
      );

      if (accounts.length === 0) {
        state.accountData = undefined;
        updateCredentialsStorage(undefined);
        return;
      }

      state.accountData.accounts = accounts;
      if (state.accountData.activeHandle === action.payload) {
        state.accountData.activeHandle = accounts[0].handle;
      }

      updateCredentialsStorage(state.accountData);
    },
    setPrimaryAccount: (state, action: PayloadAction<string>) => {
      if (!state.accountData) return;

      state.accountData.activeHandle = action.payload;

      updateCredentialsStorage(state.accountData);
    },

    reset: (state) => {
      return initialState(state.connectedInstance);
    },

    updateUserDetails(state, action: PayloadAction<GetSiteResponse>) {
      state.site = action.payload;
    },
    updateConnectedInstance(state, action: PayloadAction<string>) {
      state.connectedInstance = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  addAccount,
  removeAccount,
  setPrimaryAccount,
  reset,
  updateUserDetails,
  updateConnectedInstance,
} = authSlice.actions;

export default authSlice.reducer;

export const activeAccount = createSelector(
  [
    (state: RootState) => state.auth.accountData?.accounts,
    (state: RootState) => state.auth.accountData?.activeHandle,
  ],
  (accounts, activeHandle) => {
    return accounts?.find(({ handle }) => handle === activeHandle);
  }
);

export const jwtSelector = createSelector([activeAccount], (account) => {
  return account?.jwt;
});

export const jwtPayloadSelector = createSelector([jwtSelector], (jwt) =>
  jwt ? parseJWT(jwt) : undefined
);

export const jwtIssSelector = (state: RootState) =>
  jwtPayloadSelector(state)?.iss;

export const handleSelector = createSelector([activeAccount], (account) => {
  return account?.handle;
});

export const login =
  (clientId: string, clientSecret: string, redirectURI: string, agent: string) =>
  async (dispatch: AppDispatch) => {
    try {
        localStorage.setItem("clientId", clientId)
        localStorage.setItem("redirectURI", redirectURI)
        localStorage.setItem("userAgent", agent)
        localStorage.setItem("clientSecret", clientSecret)

        const allScopes = "identity,edit,flair,history,modconfig,modflair,modlog,modposts,modwiki,mysubreddits,privatemessages,read,report,save,submit,subscribe,vote,wikiedit,wikiread"
        const authUrl = `https://www.reddit.com/api/v1/authorize.compact?client_id=${clientId}&response_type=code&state=lkasfjdlfkajsldkj&redirect_uri=${redirectURI}&duration=permanent&scope=${allScopes}`
        window.open(authUrl, "_self")

    } catch (error) {
      // todo
      throw error;
    }

    dispatch(addAccount({ jwt: res.jwt, handle: getRemoteHandle(myUser) }));
    dispatch(updateConnectedInstance(parseJWT(res.jwt).iss));
  };

export const getSite =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const jwtPayload = jwtPayloadSelector(getState());

    if (!jwtPayload) return;

    const { iss } = jwtPayload;

    const details = await new LemmyHttp(`/api/${iss}`).getSite({
      auth: jwtSelector(getState()),
    });

    dispatch(updateUserDetails(details));
  };

export const logoutEverything = () => async (dispatch: AppDispatch) => {
  dispatch(reset());
  dispatch(resetPosts());
  dispatch(resetComments());
  dispatch(resetUsers());
  dispatch(resetInbox());
};

export const changeAccount =
  (handle: string) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(resetPosts());
    dispatch(resetComments());
    dispatch(resetUsers());
    dispatch(resetInbox());
    dispatch(setPrimaryAccount(handle));

    const iss = jwtIssSelector(getState());
    if (iss) dispatch(updateConnectedInstance(iss));
  };

export const logoutAccount =
  (handle: string) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    // Going to need to change active accounts
    if (handle === getState().auth.accountData?.activeHandle) {
      dispatch(resetPosts());
      dispatch(resetComments());
      dispatch(resetUsers());
      dispatch(resetInbox());
    }

    dispatch(removeAccount(handle));
  };

function parseJWT(payload: string): LemmyJWT {
  const base64 = payload.split(".")[1];
  const jsonPayload = atob(base64);
  return JSON.parse(jsonPayload);
}

export const clientSelector = createSelector(
  [(state: RootState) => state.auth.connectedInstance, jwtIssSelector],
  (connectedInstance, iss) => {
    // never leak the jwt to the incorrect server
    return getClient(iss ?? connectedInstance);
  }
);

function updateCredentialsStorage(
  accounts: CredentialStoragePayload | undefined
) {
  if (!accounts) {
    localStorage.removeItem(MULTI_ACCOUNT_STORAGE_NAME);
    return;
  }

  localStorage.setItem(MULTI_ACCOUNT_STORAGE_NAME, JSON.stringify(accounts));
}

function getCredentialsFromStorage(): CredentialStoragePayload | undefined {
  const serializedCredentials = localStorage.getItem(
    MULTI_ACCOUNT_STORAGE_NAME
  );
  if (!serializedCredentials) return;
  return JSON.parse(serializedCredentials);
}
