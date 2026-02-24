import { useRecoilState } from "recoil";
import { D2I18n, ProgramConfig } from "dhis2-semis-types";
import React, { useEffect, useState } from "react";
import { TableDataRefetch, Modules } from "dhis2-semis-types";
import { Table } from "dhis2-semis-components";
import EnrollmentActionsButtons from "../../components/enrollmentButtons/EnrollmentActionsButtons";
import { useHeader, useTableData, useUrlParams, useViewPortWidth } from "dhis2-semis-functions";
import InfoPageComp from "../info/info";
import OuNameContainer from "../../utils/common/getOrgUnit";
import ApproveTranfer from "../../components/modal/modalTransfer";
import useGetSelectedKeys from "../../hooks/config/useGetSelectedKeys";
import { TabPosistion } from "../../types/tabs/TabsTypes";

const Transfer = ({ i18n }: { i18n: D2I18n }) => {
  const [data, setData] = useState<any>([]);
  const { viewPortWidth } = useViewPortWidth();
  const { urlParameters, add } = useUrlParams();
  const [refetch] = useRecoilState(TableDataRefetch);
  const [modalDetails, setModalDetails] = useState<any>({});
  const { dataStoreData, program: programData } = useGetSelectedKeys()
  const { getData, loading } = useTableData({ module: Modules.Transfer });
  const { school, schoolName, position, sectionType, academicYear } = urlParameters;
  const [pagination, setPagination] = useState({ page: 1, pageSize: 5, totalPages: 0, totalElements: 0 });
  const { getOuDisplayName, loaading: loadingOU } = OuNameContainer({ dataStoreData, setData, setModalDetails });
  const { columns } = useHeader({ dataStoreData, programConfigData: programData as unknown as ProgramConfig, programStage: dataStoreData?.transfer?.programStage });
  const [filterState, setFilterState] = useState<{ dataElements: any; attributes: any; }>({ attributes: [], dataElements: [] });

  useEffect(() => {
    if (position == null || position === undefined)
      add('position', TabPosistion.INCOMING)
  }, [position])

  useEffect(() => {
    if (school) {
      void getData({
        ...pagination,
        program: programData!.id as string,
        attributeFilters: filterState.attributes,
        otherProgramStage: dataStoreData?.transfer?.programStage,
        baseProgramStage: dataStoreData?.registration?.programStage as string,
        orgUnit: position === TabPosistion.OUTGOING ? school : null as unknown as string,
        dataElementFilters: position === TabPosistion.INCOMING ?
          [`${dataStoreData?.transfer?.destinySchool as unknown as string}:in:${school}`]
          : filterState.dataElements,
      }).then((resp: any) => {
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        void getOuDisplayName(rows);
        setPagination((prev: any) => ({
          ...prev,
          totalPages: resp?.pagination?.totalPages ?? 0,
          totalElements: resp?.pagination?.totalElements ?? 0
        }))
      }).catch(() => {
        void getOuDisplayName([]);
      });
    }
  }, [academicYear, sectionType, filterState, refetch, school, schoolName, pagination?.page, pagination?.pageSize, position]);

  return (
    <div style={{ height: "85vh" }}>
      {!(Boolean(schoolName) && Boolean(school)) ? (
        <InfoPageComp i18n={i18n} />
      ) : (
        <>
          <Table
            title={i18n.t("Transfers")}
            programConfig={programData!}
            viewPortWidth={viewPortWidth}
            columns={[...(columns || []), { ...columns?.[0], displayName: i18n.t("Resquest time"), id: "requestTime" }]}
            tableData={data}
            defaultFilterNumber={3}
            filterState={filterState}
            loading={loading || loadingOU}
            setFilterState={setFilterState}
            pagination={pagination}
            setPagination={setPagination}
            rightElements={<EnrollmentActionsButtons  i18n={i18n} />}
          />
          {modalDetails?.open && <ApproveTranfer i18n={i18n} modalDetails={modalDetails} setModalDetails={setModalDetails} />}
        </>
      )}
    </div>
  );
};

export default Transfer;
