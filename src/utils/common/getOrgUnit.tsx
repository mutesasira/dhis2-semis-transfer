import React from 'react'
import { useGetOusData } from '../../hooks/orgUnits/useGetOrgUnits';
import { DataStoreProps } from 'dhis2-semis-types';
import { useUrlParams } from 'dhis2-semis-functions';
import { useGetComponent } from './getComponent';
import { getFormattedTimeDifference } from './getDiff';
import { useTransferConst } from '../../hooks/transferOptions/statusOptions';
import { TabPosistion } from '../../types/tabs/TabsTypes';

function OuNameContainer({ dataStoreData, setData, setModalDetails }: { setModalDetails: any, setData: (args: any) => any, dataStoreData: DataStoreProps[0] }) {
    const { getOuName } = useGetOusData()
    const [loaading, setLoading] = React.useState(true)
    const { urlParameters } = useUrlParams()
    const { position } = urlParameters
    const { getComponent } = useGetComponent({ setModalDetails, dataStore: dataStoreData })
    const { transferConst } = useTransferConst({ dataStore: dataStoreData })

    async function getOuDisplayName(tableData: any[] = []) {
        setLoading(true);

        try {
            const rows = Array.isArray(tableData) ? tableData : [];
            const idHolder: Record<string, string> = {};
            const destinySchool = dataStoreData.transfer.destinySchool;
            const originSchool = dataStoreData.transfer.originSchool;

            const allOuIds = new Set<string>();

            for (const data of rows) {
                if (data?.[destinySchool]) allOuIds.add(data[destinySchool]);
                if (data?.ownershipOu) allOuIds.add(data.ownershipOu);
            }

            const ouIdsToFetch = Array.from(allOuIds).filter((id) => !idHolder[id]);

            if (ouIdsToFetch.length > 0) {
                const responses = await Promise.all(ouIdsToFetch.map((id) => getOuName(id).catch(() => null)));

                responses.forEach((res: any, i) => {
                    const id = ouIdsToFetch[i];
                    const name = res?.results?.name ?? id;
                    idHolder[id] = name;
                });
            }

            for (const data of rows) {
                data[destinySchool] = idHolder[data[destinySchool]] || data[destinySchool];
                data[originSchool] = idHolder[data['ownershipOu']] || data['ownershipOu'];

                const configKey = (dataStoreData?.transfer?.statusOptions as unknown as any)?.find((x: any) => x.code == data[dataStoreData.transfer.status])

                if (configKey?.configKey === transferConst({ status: "penddingCode" })) {
                    data['requestTime'] = getFormattedTimeDifference(data.registrationEventOccurredAt);
                } else {
                    data['requestTime'] = '--';
                }

                data[dataStoreData.transfer.status] = getComponent(
                    configKey,
                    data,
                    position === TabPosistion.INCOMING,
                    data?.status == 'CANCELLED'
                );
            }

            setData(rows);
        } catch {
            setData(Array.isArray(tableData) ? tableData : []);
        } finally {
            setLoading(false);
        }
    }

    return { getOuDisplayName, loaading }
}
export default OuNameContainer
