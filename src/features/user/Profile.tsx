import React, { useCallback } from "react";
import { IonIcon, IonLabel, IonList, IonItem } from "@ionic/react";
import styled from "@emotion/styled";
import Scores from "./Scores";
import { albumsOutline, chatbubbleOutline } from "ionicons/icons";
import { GetPersonDetailsResponse } from "lemmy-js-client";
import { useBuildGeneralBrowseLink } from "../../helpers/routes";
import { getHandle } from "../../helpers/lemmy";
import { MaxWidthContainer } from "../shared/AppContent";
import { FetchFn } from "../feed/Feed";
import useClient from "../../helpers/useClient";
import { LIMIT } from "../../services/lemmy";
import { useAppSelector } from "../../store";
import PostCommentFeed, {
  PostCommentItem,
  isPost,
} from "../feed/PostCommentFeed";
import { jwtSelector } from "../auth/authSlice";

export const InsetIonItem = styled(IonItem)`
  --background: var(--ion-tab-bar-background, var(--ion-color-step-50, #fff));
`;

export const SettingLabel = styled(IonLabel)`
  margin-left: 1rem;
`;

interface ProfileProps {
  person: GetPersonDetailsResponse;
}

export default function Profile({ person }: ProfileProps) {
  const buildGeneralBrowseLink = useBuildGeneralBrowseLink();
  const jwt = useAppSelector(jwtSelector);
  const client = useClient();

  const fetchFn: FetchFn<PostCommentItem> = useCallback(
    async (page) => {
      const response = await client.getPersonDetails({
        limit: LIMIT,
        username: getHandle(person.person_view.person),
        page,
        sort: "New",
        auth: jwt,
      });
      return [...response.posts, ...response.comments].sort(
        (a, b) => getCreatedDate(b) - getCreatedDate(a)
      );
    },
    [person, client, jwt]
  );

  const header = useCallback(
    () => (
      <MaxWidthContainer>
        <Scores
          aggregates={person.person_view.counts}
          accountCreated={person.person_view.person.published}
        />
        <IonList inset color="primary">
          <InsetIonItem
            routerLink={buildGeneralBrowseLink(
              `/u/${getHandle(person.person_view.person)}/posts`
            )}
          >
            <IonIcon icon={albumsOutline} color="primary" />{" "}
            <SettingLabel>Posts</SettingLabel>
          </InsetIonItem>
          <InsetIonItem
            routerLink={buildGeneralBrowseLink(
              `/u/${getHandle(person.person_view.person)}/comments`
            )}
          >
            <IonIcon icon={chatbubbleOutline} color="primary" />{" "}
            <SettingLabel>Comments</SettingLabel>
          </InsetIonItem>
          {/* <InsetIonItem routerLink="/">
            <IonIcon icon={bookmarkOutline} color="primary" />{" "}
            <SettingLabel>Saved</SettingLabel>
          </InsetIonItem> */}
        </IonList>
      </MaxWidthContainer>
    ),
    [person, buildGeneralBrowseLink]
  );

  return <PostCommentFeed fetchFn={fetchFn} header={header} />;
}

function getCreatedDate(item: PostCommentItem): number {
  if (isPost(item)) return Date.parse(`${item.post.published}Z`);
  return Date.parse(`${item.comment.published}Z`);
}
