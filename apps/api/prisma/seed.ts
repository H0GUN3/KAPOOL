import { PrismaClient } from '@prisma/client';

import { hashLocalDemoPassword } from '../src/auth/password';

const prisma = new PrismaClient();

const demoPasswordHash = hashLocalDemoPassword('kapool-local-demo');

async function main() {
  await prisma.report.deleteMany();
  await prisma.settlementRecord.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const passenger = await prisma.user.create({
    data: {
      email: 'passenger@kapool.local',
      passwordHash: demoPasswordHash,
      role: 'passenger',
      profile: {
        create: {
          name: '김하늘',
          nickname: 'HaNeul',
          schoolEmail: 'passenger@kapool.local',
          department: '컴퓨터정보공학과',
          phone: '010-4120-1001',
          homeRegion: '전주 효자동',
        },
      },
    },
  });

  const otherPassenger = await prisma.user.create({
    data: {
      email: 'other-passenger@kapool.local',
      passwordHash: demoPasswordHash,
      role: 'passenger',
      profile: {
        create: {
          name: '박민지',
          nickname: 'Minji UX',
          schoolEmail: 'other-passenger@kapool.local',
          department: '산업디자인학과',
          phone: '010-5241-4004',
          homeRegion: '익산 영등동',
        },
      },
    },
  });

  const driver = await prisma.user.create({
    data: {
      email: 'driver@kapool.local',
      passwordHash: demoPasswordHash,
      role: 'driver',
      profile: {
        create: {
          name: '이도윤',
          nickname: 'Doyun Driver',
          schoolEmail: 'driver@kapool.local',
          department: '경영학과',
          phone: '010-6338-2002',
          homeRegion: '익산 모현동',
        },
      },
    },
  });

  const secondDriver = await prisma.user.create({
    data: {
      email: 'second-driver@kapool.local',
      passwordHash: demoPasswordHash,
      role: 'driver',
      profile: {
        create: {
          name: '정서준',
          nickname: 'SeoJun EV',
          schoolEmail: 'second-driver@kapool.local',
          department: '기계공학부',
          phone: '010-7422-2020',
          homeRegion: '군산 수송동',
        },
      },
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@kapool.local',
      passwordHash: demoPasswordHash,
      role: 'admin',
      isAdmin: true,
      adminNote: '신고 검토와 운영자 권한 관리를 담당하는 계정입니다.',
      profile: {
        create: {
          name: '최유진',
          nickname: 'KAPOOL Operator',
          schoolEmail: 'admin@kapool.local',
          department: '학생지원과',
          phone: '010-3550-3003',
          homeRegion: '군산대학교 본부',
        },
      },
    },
  });

  const suspendedUser = await prisma.user.create({
    data: {
      email: 'suspended@kapool.local',
      passwordHash: demoPasswordHash,
      role: 'passenger',
      isSuspended: true,
      adminNote: '반복 노쇼와 운행 확인 문제로 이용이 제한된 계정입니다.',
      profile: {
        create: {
          name: '오태식',
          nickname: 'TaeSik Rider',
          schoolEmail: 'suspended@kapool.local',
          department: '토목공학과',
          phone: '010-9000-8888',
          homeRegion: '전주 덕진구',
        },
      },
    },
  });

  await prisma.rideRequest.createMany({
    data: [
      {
        id: 'seed-ride-request-jeonju-campus-morning',
        passengerId: passenger.id,
        from: '전주 효자동',
        to: '군산대학교 정문',
        time: '2026-06-12 08:20',
        content: '금요일 1교시 전에 도착할 수 있는 카풀을 찾습니다. 전주대 스타센터 근처에서 탑승 가능합니다.',
      },
      {
        id: 'seed-ride-request-iksan-library-morning',
        passengerId: otherPassenger.id,
        from: '익산 영등동',
        to: '군산대학교 황룡도서관',
        time: '2026-06-12 09:00',
        content: '노트북 가방 1개가 있고 도서관 앞 하차를 희망합니다. 익산역 경유도 괜찮습니다.',
      },
      {
        id: 'seed-ride-request-gunsan-lab-afternoon',
        passengerId: passenger.id,
        from: '군산 수송동',
        to: '군산대학교 공대 5호관',
        time: '2026-06-13 13:30',
        content: '실험 수업 전 이동 요청입니다. 조용한 탑승을 선호하고 10분 정도 시간 조정 가능합니다.',
      },
    ],
  });

  await prisma.chatRoom.createMany({
    data: [
      {
        rideRequestId: 'seed-ride-request-jeonju-campus-morning',
        participantIds: [passenger.id],
      },
      {
        rideRequestId: 'seed-ride-request-iksan-library-morning',
        participantIds: [otherPassenger.id],
      },
      {
        rideRequestId: 'seed-ride-request-gunsan-lab-afternoon',
        participantIds: [passenger.id],
      },
    ],
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        roomId: (await prisma.chatRoom.findUniqueOrThrow({ where: { rideRequestId: 'seed-ride-request-jeonju-campus-morning' } })).id,
        type: 'system',
        text: '카풀 요청 대화방이 열렸습니다.',
      },
      {
        roomId: (await prisma.chatRoom.findUniqueOrThrow({ where: { rideRequestId: 'seed-ride-request-iksan-library-morning' } })).id,
        type: 'system',
        text: '카풀 요청 대화방이 열렸습니다.',
      },
      {
        roomId: (await prisma.chatRoom.findUniqueOrThrow({ where: { rideRequestId: 'seed-ride-request-gunsan-lab-afternoon' } })).id,
        type: 'system',
        text: '카풀 요청 대화방이 열렸습니다.',
      },
    ],
  });

  const sedan = await prisma.vehicle.create({
    data: {
      ownerId: driver.id,
      model: 'Hyundai Avante CN7',
      color: 'Pearl White',
      capacity: 4,
      plateLastFour: '1205',
    },
  });

  const ev = await prisma.vehicle.create({
    data: {
      ownerId: secondDriver.id,
      model: 'Kia Niro EV',
      color: 'Graphite Gray',
      capacity: 5,
      plateLastFour: '4421',
    },
  });

  const jeonjuOpenRide = await prisma.ride.create({
    data: {
      from: '전주 효자동',
      to: '군산대학교 정문',
      departureTime: new Date('2026-06-10T23:40:00.000Z'),
      seats: 2,
      fare: 5500,
      status: 'open',
      driverId: driver.id,
      vehicleId: sedan.id,
      waypoints: ['전주대 스타센터', '팔복동 공단입구', '개정IC'],
    },
  });

  const iksanFullRide = await prisma.ride.create({
    data: {
      from: '익산역 KTX 3번 출구',
      to: '군산대학교 황룡도서관',
      departureTime: new Date('2026-06-11T00:30:00.000Z'),
      seats: 0,
      fare: 4500,
      status: 'full',
      driverId: driver.id,
      vehicleId: sedan.id,
      waypoints: ['익산 영등동', '대야터미널'],
    },
  });

  const gunsanClosedRide = await prisma.ride.create({
    data: {
      from: '군산 수송동 롯데마트',
      to: '군산대학교 공대 5호관',
      departureTime: new Date('2026-06-09T23:55:00.000Z'),
      seats: 1,
      fare: 2500,
      status: 'closed',
      driverId: secondDriver.id,
      vehicleId: ev.id,
      waypoints: ['나운동 예술의전당', '미룡동 원룸촌'],
    },
  });

  const jeonjuEveningRide = await prisma.ride.create({
    data: {
      from: '군산대학교 학생회관',
      to: '전주 한옥마을 공영주차장',
      departureTime: new Date('2026-06-11T09:20:00.000Z'),
      seats: 3,
      fare: 6000,
      status: 'open',
      driverId: secondDriver.id,
      vehicleId: ev.id,
      waypoints: ['군산터미널', '전주 혁신도시'],
    },
  });

  const approvedReservation = await prisma.reservation.create({
    data: {
      rideId: jeonjuOpenRide.id,
      passengerId: passenger.id,
      status: 'approved',
      seatsRequested: 1,
      message: '정문 앞 CU에서 5분 전 대기할게요. 앞좌석도 괜찮습니다.',
    },
  });

  await prisma.reservation.create({
    data: {
      rideId: jeonjuEveningRide.id,
      passengerId: passenger.id,
      status: 'pending',
      seatsRequested: 1,
      message: '전주 혁신도시에서 내려도 괜찮을까요?',
    },
  });

  const rejectedReservation = await prisma.reservation.create({
    data: {
      rideId: iksanFullRide.id,
      passengerId: suspendedUser.id,
      status: 'rejected',
      seatsRequested: 1,
      message: '익산역에서 캐리어 2개가 있습니다. 늦은 요청이라 죄송합니다.',
    },
  });

  const cancelledReservation = await prisma.reservation.create({
    data: {
      rideId: gunsanClosedRide.id,
      passengerId: passenger.id,
      status: 'cancelled',
      seatsRequested: 1,
      message: '실험 수업이 취소되어 예약도 취소합니다.',
    },
  });

  const completedReservation = await prisma.reservation.create({
    data: {
      rideId: iksanFullRide.id,
      passengerId: otherPassenger.id,
      status: 'completed',
      seatsRequested: 2,
      message: '친구와 함께 탑승합니다. 뒷좌석도 괜찮습니다.',
    },
  });

  const approvedChatRoom = await prisma.chatRoom.create({
    data: {
      rideId: jeonjuOpenRide.id,
      reservationId: approvedReservation.id,
      participantIds: [driver.id, passenger.id],
      messages: {
        create: [
          {
            type: 'system',
            text: '예약이 승인되어 채팅방이 열렸습니다.',
          },
          {
            type: 'sysinfo',
            text: '픽업: 전주대 스타센터 08:35, 하차: 군산대 정문.',
          },
          {
            type: 'other',
            senderId: driver.id,
            text: '하늘님, 전주대 스타센터 회전문 앞에서 만나요. 도착 3분 전에 ping 드릴게요.',
          },
          {
            type: 'other',
            senderId: passenger.id,
            text: '네 감사합니다! 민트색 KAPOOL 배지를 가방에 달고 있을게요.',
          },
        ],
      },
    },
  });

  const completedChatRoom = await prisma.chatRoom.create({
    data: {
      rideId: iksanFullRide.id,
      reservationId: completedReservation.id,
      participantIds: [driver.id, otherPassenger.id],
      messages: {
        create: [
          {
            type: 'system',
            text: '운행이 완료되었습니다. 차주가 필요한 안내를 채팅으로 공유할 수 있습니다.',
          },
          {
            type: 'sysinfo',
            text: '운행 완료: 익산역 → 군산대학교 황룡도서관.',
          },
          {
            type: 'other',
            senderId: otherPassenger.id,
            text: '도서관 앞까지 안전하게 도착했습니다. 감사합니다!',
          },
          {
            type: 'other',
            senderId: driver.id,
            text: '차주 송금 안내: 예금주 이도윤 / 은행 카풀은행 / 계좌 123-456-7890. 송금은 KAPOOL 앱 밖에서 차주와 직접 확인해 주세요.',
          },
          {
            type: 'other',
            senderId: driver.id,
            text: '확인했습니다. 다음에 또 같이 가요.',
          },
        ],
      },
    },
  });

  const quietChatRoom = await prisma.chatRoom.create({
    data: {
      rideId: gunsanClosedRide.id,
      reservationId: cancelledReservation.id,
      participantIds: [secondDriver.id, passenger.id],
      messages: {
        create: [
          {
            type: 'system',
            text: '예약 취소 이력이 있는 저활성 채팅방입니다.',
          },
        ],
      },
    },
  });

  const unpaidSettlement = await prisma.settlementRecord.create({
    data: {
      rideId: jeonjuOpenRide.id,
      reservationId: approvedReservation.id,
      payerId: passenger.id,
      receiverId: driver.id,
      amount: 5500,
      status: 'unpaid',
      note: '예약 승인 후 탑승 위치를 확인했습니다.',
    },
  });

  await prisma.settlementRecord.create({
    data: {
      rideId: iksanFullRide.id,
      reservationId: completedReservation.id,
      payerId: otherPassenger.id,
      receiverId: driver.id,
      amount: 9000,
      status: 'paid',
      note: '운행 완료 후 정산 상태를 확인했습니다.',
    },
  });

  const disputedSettlement = await prisma.settlementRecord.create({
    data: {
      rideId: iksanFullRide.id,
      reservationId: rejectedReservation.id,
      payerId: suspendedUser.id,
      receiverId: driver.id,
      amount: 4500,
      status: 'disputed',
      note: '거절된 요청과 연결된 정산 이의 제기 기록입니다.',
    },
  });

  await prisma.settlementRecord.create({
    data: {
      rideId: gunsanClosedRide.id,
      reservationId: cancelledReservation.id,
      payerId: passenger.id,
      receiverId: secondDriver.id,
      amount: 0,
      status: 'waived',
      note: 'Cancellation accepted before pickup, fare waived by driver.',
    },
  });

  await prisma.report.createMany({
    data: [
      {
        type: 'settlement_missing',
        status: 'open',
        reporterId: driver.id,
        rideId: jeonjuOpenRide.id,
        reservationId: approvedReservation.id,
        chatRoomId: approvedChatRoom.id,
        paymentRecordId: unpaidSettlement.id,
        subjectUserId: passenger.id,
        description: '탑승 승인 후 정산 확인이 늦어 운영자 검토가 요청되었습니다.',
      },
      {
        type: 'inappropriate_chat',
        status: 'in_review',
        reporterId: otherPassenger.id,
        rideId: iksanFullRide.id,
        reservationId: completedReservation.id,
        chatRoomId: completedChatRoom.id,
        subjectUserId: driver.id,
        description: '도착 후 대화 톤이 불편했다는 신고입니다. 완료된 채팅방 맥락 확인이 필요합니다.',
        adminNote: '메시지 흐름과 참여자 이력을 함께 검토 중입니다.',
      },
      {
        type: 'safety_issue',
        status: 'resolved',
        reporterId: passenger.id,
        rideId: gunsanClosedRide.id,
        reservationId: cancelledReservation.id,
        chatRoomId: quietChatRoom.id,
        subjectUserId: secondDriver.id,
        description: '차량 위치 공유가 늦어 안전 확인 요청이 접수되었습니다. 이후 차주가 픽업 정보를 보완했습니다.',
        adminNote: '차주가 경로와 픽업 절차를 확인해 해결 처리했습니다.',
      },
      {
        type: 'account_auth',
        status: 'dismissed',
        reporterId: admin.id,
        subjectUserId: suspendedUser.id,
        description: '정지 계정의 인증/계정 검토 경로를 확인하기 위한 신고입니다.',
        adminNote: '계정 제한 사유가 확인되어 기각 처리했습니다.',
      },
      {
        type: 'settlement_missing',
        status: 'in_review',
        reporterId: driver.id,
        rideId: iksanFullRide.id,
        reservationId: rejectedReservation.id,
        paymentRecordId: disputedSettlement.id,
        subjectUserId: suspendedUser.id,
        description: '거절된 예약 요청과 정산 이의 제기가 함께 접수되었습니다.',
        adminNote: '거절 예약과 정산 이의 제기 내역을 분리해 검토 중입니다.',
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
