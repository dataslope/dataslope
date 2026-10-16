import React from "react";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";

/** Placeholder for Database Design Unit 9: the series intro alone. */
export const DbRelationalHistory: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 9" title="Where it came from" />
  </EditorialPage>
);
