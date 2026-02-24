import { useState } from 'react'
import { useRecoilState } from 'recoil'
import { useConfig, useDataEngine } from '@dhis2/app-runtime'
import { useGetEventsByEnrollment } from '../events/useGetEventsByEnrollment'
import { TableDataRefetch } from 'dhis2-semis-types'
import { useTransferConst } from '../transferOptions/statusOptions'
import { getOwnershipTransferQueryPropsCandidates, useShowAlerts, useUploadEvents } from 'dhis2-semis-functions'
import { formatEnrollmentBody } from '../../utils/tei/enrollmentBody'
import useGetUsedProgramStages from '../programStages/useGetUsedPProgramStages'
import useGetSelectedKeys from '../config/useGetSelectedKeys'

const TRANSFERQUERY: any = {
    resource: 'tracker/ownership/transfer',
    type: 'update',
    params: (params: any) => params
}

export function useTransferTEI({ selectedTei, handleCloseApproval }: { selectedTei: any, handleCloseApproval: () => void }) {
    const config = useConfig()
    const engine = useDataEngine()
    const { show, hide } = useShowAlerts()
    const { dataStoreData, program: programData } = useGetSelectedKeys()
    const [loading, setloading] = useState(false)
    const [refetch, setRefetch] = useRecoilState<boolean>(TableDataRefetch)
    const { transferConst } = useTransferConst({ dataStore: dataStoreData })
    const { uploadValues } = useUploadEvents()
    const { getEventsByEnrollment, loading: loadingEvents } = useGetEventsByEnrollment()
    const programStagesToTransfer = useGetUsedProgramStages()
    const transferOwnership = async ({ program, ou, trackedEntityInstance }: { program: string, ou: string, trackedEntityInstance: string }) => {
        let lastError: any
        const candidates = getOwnershipTransferQueryPropsCandidates({
            queryProps: {
                program,
                ou,
                trackedEntityInstance
            },
            apiVersion: config.apiVersion
        })

        for (const candidate of candidates) {
            try {
                await engine.mutate(TRANSFERQUERY, {
                    variables: candidate
                })
                return
            } catch (error) {
                lastError = error
            }
        }

        throw lastError
    }

    const transferTEI = async (ou: any) => {
        setloading(true)
        const events = await getEventsByEnrollment(selectedTei?.enrollmentId, selectedTei?.trackedEntity, programStagesToTransfer)
        const registrationEvent: any = events?.filter((x: any) => x?.programStage == dataStoreData.registration.programStage)[0] ?? {}
        const index: any = events?.findIndex((x: any) => x?.programStage == dataStoreData.transfer.programStage)
        const transferEvent: any = events?.splice(index, 1)[0]

        if (Object.keys(registrationEvent).length === 0) {
            show({ message: `Registration event is missing in this enrollment.`, type: { critical: true } })
            setTimeout(hide, 5000);
            handleCloseApproval();
        }

        else {
            await transferOwnership({
                program: selectedTei?.programId,
                ou,
                trackedEntityInstance: selectedTei?.trackedEntity
            })
                .then(async () => {
                    const transferStatus = dataStoreData.transfer?.statusOptions?.find((x: any) => x.configKey === "approvedCode")?.code

                    const trackedEntities = formatEnrollmentBody(programData,
                        events!,
                        registrationEvent,
                        ou,
                        transferEvent,
                        { ...selectedTei, trackedEntityType: dataStoreData.trackedEntityType },
                        transferStatus,
                        dataStoreData?.transfer?.status
                    )
                    await uploadValues({ trackedEntities: trackedEntities }, 'COMMIT', 'CREATE_AND_UPDATE').then(() => {
                        setloading(false)
                        handleCloseApproval(); setRefetch(!refetch)
                    })
                })
                .catch(e => {
                    setloading(false)
                }).finally(() =>
                    setloading(false)
                )
        }
    }

    const rejectTEI = async () => {
        setloading(true)
        const events = await getEventsByEnrollment(selectedTei?.enrollmentId, selectedTei?.trackedEntity, [dataStoreData.transfer.programStage])
        const transferStatus = dataStoreData?.transfer?.statusOptions?.find((x: any) => x.configKey === "reprovedCode")?.code

        const updatedEvent = [{
            ...events?.[0],
            dataValues: [...events?.[0]?.dataValues?.filter((x: any) => x?.dataElement != dataStoreData?.transfer?.status),
            {
                dataElement: dataStoreData?.transfer?.status,
                value: transferStatus
            }]
        }]

        await uploadValues({ events: updatedEvent }, 'COMMIT', 'CREATE_AND_UPDATE').then(() => {
            setloading(false)
            handleCloseApproval(); setRefetch(!refetch)
        })

        setloading(false)
    }

    return {
        loading: loading,
        loadingEvents,
        transferTEI,
        rejectTEI
    }
}
